import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CLIENT_PORTAL_COOKIE, getPortalClientFromCookie } from "@/lib/clientPortalAuth";
import { SENT_COUNT_STATUSES } from "@/lib/bot/sendSafety";
import { CLIENT_SAFE_SELECT } from "@/lib/types";
import { adminDb } from "@/lib/supabaseAdmin";
import { dateKey, defaultDateRange } from "@/lib/dateRange";

const VISIBLE_MESSAGE_STATUSES = ["draft", "queued", "sent", "delivered", "opened", "replied", "follow_up_sent", "bounced", "spam", "unsubscribed"] as const;

const SENT_OR_DELIVERED_STATUSES = ["sent", "delivered", "opened", "replied", "follow_up_sent"] as const;

function isSentLike(message: { status: string; sent_at?: string | null }) {
  return Boolean(message.sent_at) || SENT_OR_DELIVERED_STATUSES.includes(message.status as any);
}

function isDeliveredLike(message: { status: string; sent_at?: string | null; delivered_at?: string | null }) {
  return isSentLike(message) || Boolean(message.delivered_at);
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
  const [client, campaigns, leads, previousLeads, messages, approvalMessages, previousMessages, monthlySent] = await Promise.all([
    db.from("client_accounts").select(CLIENT_SAFE_SELECT).eq("id", portalClient.id).single(),
    db.from("campaigns").select("id, name, target_industries, target_locations, daily_limit, monthly_limit, warmup_daily_limits, auto_send_enabled, requires_approval_before_send, send_on_weekends, follow_up_delay_days, max_follow_ups, last_run_at, next_run_at, status, created_at").eq("client_id", portalClient.id).order("created_at", { ascending: false }),
    db.from("leads").select("id, company_name, industry, city, email, score, status, created_at").eq("client_id", portalClient.id).eq("status", "sent").not("email", "is", null).gte("created_at", range.fromIso).lt("created_at", range.toExclusiveIso).order("created_at", { ascending: false }).limit(200),
    db.from("leads").select("id, status, created_at").eq("client_id", portalClient.id).eq("status", "sent").not("email", "is", null).gte("created_at", range.previousFromIso).lt("created_at", range.previousToExclusiveIso).limit(2000),
    db.from("messages").select("id, lead_id, email_to, subject, body, status, sent_at, delivered_at, opened_at, replied_at, bounced_at, spam_at, follow_up_count, sequence_step, created_at, leads(company_name)").eq("client_id", portalClient.id).in("status", VISIBLE_MESSAGE_STATUSES as unknown as string[]).gte("created_at", range.fromIso).lt("created_at", range.toExclusiveIso).order("created_at", { ascending: false }).limit(200),
    db.from("messages").select("id, lead_id, email_to, subject, body, status, sent_at, delivered_at, opened_at, replied_at, bounced_at, spam_at, follow_up_count, sequence_step, created_at, leads(company_name)").eq("client_id", portalClient.id).eq("status", "draft").order("created_at", { ascending: false }).limit(200),
    db.from("messages").select("id, status, sent_at, delivered_at, opened_at, replied_at, bounced_at, spam_at, sequence_step, created_at").eq("client_id", portalClient.id).in("status", VISIBLE_MESSAGE_STATUSES as unknown as string[]).gte("created_at", range.previousFromIso).lt("created_at", range.previousToExclusiveIso).limit(2000),
    db.from("messages").select("id", { count: "exact", head: true }).eq("client_id", portalClient.id).gte("sent_at", monthStart).in("status", SENT_COUNT_STATUSES as unknown as string[]),
  ]);

  const error = client.error || campaigns.error || leads.error || previousLeads.error || messages.error || approvalMessages.error || previousMessages.error || monthlySent.error;
  if (error) return jsonError(error.message, 500);
  const mergedMessages = Array.from(new Map([...(approvalMessages.data || []), ...(messages.data || [])].map((message) => [message.id, message])).values());
  const currentStats = statsFor(leads.data || [], mergedMessages);
  const previousPeriodStats = statsFor(previousLeads.data || [], previousMessages.data || []);

  return NextResponse.json(
    {
      client: client.data,
      campaigns: campaigns.data || [],
      leads: leads.data || [],
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
      chartData: chartData(range, mergedMessages, leads.data || []),
      previousPeriodStats,
      trends: trendMap(currentStats, previousPeriodStats),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
