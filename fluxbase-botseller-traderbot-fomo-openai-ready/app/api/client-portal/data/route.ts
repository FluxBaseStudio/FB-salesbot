import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CLIENT_PORTAL_COOKIE, getPortalClientFromCookie } from "@/lib/clientPortalAuth";
import { SENT_COUNT_STATUSES } from "@/lib/bot/sendSafety";
import { CLIENT_SAFE_SELECT } from "@/lib/types";
import { adminDb } from "@/lib/supabaseAdmin";
import { dateKey, defaultDateRange } from "@/lib/dateRange";

const VISIBLE_MESSAGE_STATUSES = ["draft", "queued", "sent", "delivered", "opened", "replied", "follow_up_sent", "bounced", "spam", "unsubscribed"] as const;

const SENT_OR_DELIVERED_STATUSES = ["sent", "delivered", "opened", "replied", "follow_up_sent"] as const;

const CLIENT_PANEL_ROW_LIMIT = 5000;
const MESSAGE_SELECT = "id, lead_id, email_to, subject, body, status, sent_at, delivered_at, opened_at, replied_at, bounced_at, spam_at, follow_up_count, sequence_step, created_at, leads(company_name)";
const LEAD_SELECT = "id, company_name, industry, city, email, phone, score, status, created_at";

function isSentLike(message: { status: string; sent_at?: string | null }) {
  return Boolean(message.sent_at) || SENT_OR_DELIVERED_STATUSES.includes(message.status as any);
}

function isDeliveredLike(message: { status: string; sent_at?: string | null; delivered_at?: string | null }) {
  return isSentLike(message) || Boolean(message.delivered_at);
}

function messageActivityTime(message: { sent_at?: string | null; created_at?: string | null }) {
  return message.sent_at || message.created_at || "";
}

function sortByActivityDesc<T extends { sent_at?: string | null; created_at?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => messageActivityTime(b).localeCompare(messageActivityTime(a)));
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

async function readVisibleMessagesForRange(db: ReturnType<typeof adminDb>, clientId: string, fromIso: string, toIso: string) {
  const [sentInRange, unsentCreatedInRange] = await Promise.all([
    db
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("client_id", clientId)
      .in("status", VISIBLE_MESSAGE_STATUSES as unknown as string[])
      .gte("sent_at", fromIso)
      .lt("sent_at", toIso)
      .order("sent_at", { ascending: false })
      .range(0, CLIENT_PANEL_ROW_LIMIT - 1),
    db
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("client_id", clientId)
      .in("status", VISIBLE_MESSAGE_STATUSES as unknown as string[])
      .is("sent_at", null)
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .order("created_at", { ascending: false })
      .range(0, CLIENT_PANEL_ROW_LIMIT - 1),
  ]);

  if (sentInRange.error) throw sentInRange.error;
  if (unsentCreatedInRange.error) throw unsentCreatedInRange.error;

  return sortByActivityDesc(uniqueById([...(sentInRange.data || []), ...(unsentCreatedInRange.data || [])]));
}

async function readStatsMessagesForRange(db: ReturnType<typeof adminDb>, clientId: string, fromIso: string, toIso: string) {
  const { data, error } = await db
    .from("messages")
    .select("id, lead_id, status, sent_at, delivered_at, opened_at, replied_at, bounced_at, spam_at, sequence_step, created_at")
    .eq("client_id", clientId)
    .in("status", VISIBLE_MESSAGE_STATUSES as unknown as string[])
    .gte("sent_at", fromIso)
    .lt("sent_at", toIso)
    .range(0, CLIENT_PANEL_ROW_LIMIT - 1);

  if (error) throw error;
  return data || [];
}

async function readLeadsForPanel(db: ReturnType<typeof adminDb>, clientId: string, fromIso: string, toIso: string, leadIdsFromMessages: string[]) {
  const createdQuery = db
    .from("leads")
    .select(LEAD_SELECT)
    .eq("client_id", clientId)
    .eq("status", "sent")
    .not("email", "is", null)
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .order("created_at", { ascending: false })
    .range(0, CLIENT_PANEL_ROW_LIMIT - 1);

  const messageLeadIds = [...new Set(leadIdsFromMessages.filter(Boolean))];
  const leadQueries = [createdQuery];

  if (messageLeadIds.length) {
    leadQueries.push(
      db
        .from("leads")
        .select(LEAD_SELECT)
        .eq("client_id", clientId)
        .eq("status", "sent")
        .not("email", "is", null)
        .in("id", messageLeadIds.slice(0, CLIENT_PANEL_ROW_LIMIT))
        .order("created_at", { ascending: false })
        .range(0, CLIENT_PANEL_ROW_LIMIT - 1),
    );
  }

  const results = await Promise.all(leadQueries);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;

  return uniqueById(results.flatMap((result) => result.data || [])).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function parseDateInput(value: string | null, fallback: string) {
  const candidate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
  const date = new Date(`${candidate}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : candidate;
}

function apiDateRange(request: Request) {
  const defaults = defaultDateRange();
  const url = new URL(request.url);
  const dateFrom = parseDateInput(url.searchParams.get("dateFrom"), defaults.dateFrom);
  const rawDateTo = parseDateInput(url.searchParams.get("dateTo"), defaults.dateTo);
  const from = new Date(`${dateFrom}T00:00:00.000Z`);
  let to = new Date(`${rawDateTo}T00:00:00.000Z`);
  if (to.getTime() < from.getTime()) to = new Date(from);
  const toExclusive = new Date(to);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const periodMs = Math.max(toExclusive.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
  const previousTo = new Date(from);
  const previousFrom = new Date(from.getTime() - periodMs);
  return {
    dateFrom,
    dateTo: dateKey(to),
    fromIso: from.toISOString(),
    toExclusiveIso: toExclusive.toISOString(),
    previousFromIso: previousFrom.toISOString(),
    previousToExclusiveIso: previousTo.toISOString(),
  };
}

function statsFor(leads: Array<{ id: string }>, messages: Array<{ status: string; sent_at?: string | null; delivered_at?: string | null; opened_at?: string | null; replied_at?: string | null; bounced_at?: string | null; spam_at?: string | null; sequence_step?: number | null }>) {
  return {
    leads: leads.length,
    sent: messages.filter(isSentLike).length,
    delivered: messages.filter(isDeliveredLike).length,
    opened: messages.filter((message) => Boolean(message.opened_at) || ["opened", "replied"].includes(message.status)).length,
    replied: messages.filter((message) => message.status === "replied" || Boolean(message.replied_at)).length,
    bounced: messages.filter((message) => message.status === "bounced" || Boolean(message.bounced_at)).length,
    spam: messages.filter((message) => message.status === "spam" || Boolean(message.spam_at)).length,
    followUpSent: messages.filter((message) => message.status === "follow_up_sent" || Number(message.sequence_step || 0) > 0).length,
  };
}

function trendMap(current: ReturnType<typeof statsFor>, previous: ReturnType<typeof statsFor>) {
  return Object.fromEntries(
    (Object.keys(current) as Array<keyof ReturnType<typeof statsFor>>).map((key) => {
      const before = previous[key];
      if (!before) return [key, current[key] ? 100 : null];
      return [key, Math.round(((current[key] - before) / before) * 1000) / 10];
    }),
  );
}

function chartData(range: ReturnType<typeof apiDateRange>, messages: Array<{ status: string; sent_at?: string | null; created_at?: string | null }>, leads: Array<{ created_at?: string | null }>) {
  const formatter = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short" });
  const start = new Date(range.fromIso);
  const end = new Date(range.toExclusiveIso);
  const points = [];
  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10);
    points.push({
      label: formatter.format(cursor).replace(".", ""),
      value: messages.filter((message) => (message.sent_at || message.created_at || "").slice(0, 10) === key).length,
      secondary: leads.filter((lead) => (lead.created_at || "").slice(0, 10) === key).length,
    });
  }
  return points;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const portalClient = await getPortalClientFromCookie(cookieStore.get(CLIENT_PORTAL_COOKIE)?.value);
  if (!portalClient) return jsonError("Brak sesji klienta.", 401);

  const db = adminDb();
  const range = apiDateRange(request);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  try {
    const [client, campaigns, messages, approvalMessages, previousMessages, monthlySent] = await Promise.all([
      db.from("client_accounts").select(CLIENT_SAFE_SELECT).eq("id", portalClient.id).single(),
      db.from("campaigns").select("id, name, target_industries, target_locations, daily_limit, monthly_limit, warmup_daily_limits, auto_send_enabled, requires_approval_before_send, send_on_weekends, follow_up_delay_days, max_follow_ups, follow_ups_enabled, last_run_at, next_run_at, status, created_at").eq("client_id", portalClient.id).order("created_at", { ascending: false }),
      readVisibleMessagesForRange(db, portalClient.id, range.fromIso, range.toExclusiveIso),
      db.from("messages").select(MESSAGE_SELECT).eq("client_id", portalClient.id).eq("status", "draft").order("created_at", { ascending: false }).range(0, CLIENT_PANEL_ROW_LIMIT - 1),
      readStatsMessagesForRange(db, portalClient.id, range.previousFromIso, range.previousToExclusiveIso),
      db.from("messages").select("id", { count: "exact", head: true }).eq("client_id", portalClient.id).gte("sent_at", monthStart).in("status", SENT_COUNT_STATUSES as unknown as string[]),
    ]);

    const error = client.error || campaigns.error || approvalMessages.error || monthlySent.error;
    if (error) return jsonError(error.message, 500);

    const mergedMessages = sortByActivityDesc(uniqueById([...(approvalMessages.data || []), ...messages]));
    const leads = await readLeadsForPanel(db, portalClient.id, range.fromIso, range.toExclusiveIso, mergedMessages.map((message) => message.lead_id || ""));
    const previousLeadIds = [...new Set(previousMessages.map((message) => message.lead_id).filter(Boolean))];
    const previousLeads = previousLeadIds.map((id) => ({ id: id as string }));
    const currentStats = statsFor(leads, mergedMessages);
    const previousPeriodStats = statsFor(previousLeads, previousMessages);

    return NextResponse.json(
      {
        client: client.data,
        campaigns: campaigns.data || [],
        leads,
        messages: mergedMessages,
        stats: {
          campaigns: campaigns.data?.length || 0,
          leads: currentStats.leads,
          sent: currentStats.sent,
          monthlySent: monthlySent.count || 0,
          delivered: currentStats.delivered,
          opened: currentStats.opened,
          replied: currentStats.replied,
          bounced: currentStats.bounced,
          spam: currentStats.spam,
          followUpSent: currentStats.followUpSent,
        },
        dateRange: { dateFrom: range.dateFrom, dateTo: range.dateTo },
        chartData: chartData(range, mergedMessages, leads),
        previousPeriodStats,
        trends: trendMap(currentStats, previousPeriodStats),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Błąd odczytu danych panelu klienta.", 500);
  }
}
