import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { encryptSecret } from "@/lib/cryptoSecrets";
import { clientPayloadToDb } from "@/lib/clientDb";
import { applyMessageStatus } from "@/lib/bot/messageWorkflow";
import { describeMonthlyLimit, effectiveDailySendLimit, SENT_COUNT_STATUSES } from "@/lib/bot/sendSafety";
import { SIGNUP_ORDER_SAFE_SELECT } from "@/lib/signupOrder";
import { adminDb } from "@/lib/supabaseAdmin";
import { CAMPAIGN_ATTACHMENT_SAFE_SELECT, CLIENT_SAFE_SELECT, SIGNUP_ORDER_ATTACHMENT_SAFE_SELECT, type AdminResource, type Campaign, type ChartPoint, type ClientAccount, type PeriodStats } from "@/lib/types";
import { dateKey, defaultDateRange } from "@/lib/dateRange";
import {
  type BotPayload,
  validateBotPayload,
  validateCampaignPayload,
  validateClientPayload,
  validateLeadPayload,
  validateMessagePayload,
  validateRecordId,
  validateStatusPatch,
  validateSuppressionPayload,
} from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const resources = ["bots", "client_accounts", "campaigns", "leads", "messages", "suppression_list", "send_queue", "campaign_runs"] as const;
const VISIBLE_MESSAGE_STATUSES = ["sent", "delivered", "opened", "replied", "follow_up_sent", "bounced", "spam", "unsubscribed"] as const;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isResource(value: unknown): value is AdminResource {
  return typeof value === "string" && (resources as readonly string[]).includes(value);
}


async function ensureBotCapacity(payload: { bot_id?: string | null; status?: string }, currentCampaignId?: string | null) {
  if (payload.status !== "active") return;
  if (!payload.bot_id) {
    throw new Error("Aktywna kampania musi mieć przypisanego bota. Zapisz ją jako wstrzymaną albo wybierz bota.");
  }
  const db = adminDb();
  const [{ data: bot, error: botError }, { count, error: countError }] = await Promise.all([
    db.from("bots").select("id,name,status,max_parallel_campaigns").eq("id", payload.bot_id).single(),
    db.from("campaigns").select("id", { count: "exact", head: true }).eq("bot_id", payload.bot_id).eq("status", "active").neq("id", currentCampaignId || "00000000-0000-0000-0000-000000000000"),
  ]);
  if (botError) throw botError;
  if (countError) throw countError;
  if (!bot || bot.status !== "active") throw new Error("Wybrany bot nie jest aktywny. Wybierz aktywnego bota albo zostaw kampanię bez bota.");
  const limit = Math.max(Number(bot.max_parallel_campaigns || 1), 1);
  if ((count || 0) >= limit) throw new Error(`Bot ${bot.name} ma już przypisaną maksymalną liczbę aktywnych kampanii (${limit}). Dodaj kolejnego bota albo wstrzymaj inną kampanię.`);
}

function botPayloadToDb(payload: BotPayload, mode: "create" | "update") {
  const { api_key, api_key_action, ...base } = payload;
  const dbPayload: Record<string, unknown> = { ...base };
  if (api_key_action === "replace" && api_key) {
    const encrypted = encryptSecret(api_key);
    dbPayload.api_key_encrypted = encrypted.encrypted_value;
    dbPayload.api_key_iv = encrypted.iv;
    dbPayload.api_key_auth_tag = encrypted.auth_tag;
    dbPayload.api_key_last4 = encrypted.value_last4;
    dbPayload.has_api_key = true;
  } else if (api_key_action === "clear") {
    dbPayload.api_key_encrypted = null;
    dbPayload.api_key_iv = null;
    dbPayload.api_key_auth_tag = null;
    dbPayload.api_key_last4 = null;
    dbPayload.has_api_key = false;
  } else if (mode === "create") {
    dbPayload.has_api_key = false;
  }
  return dbPayload;
}

async function audit(args: { actorEmail?: string | null; action: string; resource: string; resourceId?: string | null; details?: unknown }) {
  const { error } = await adminDb().from("audit_logs").insert({
    actor_email: args.actorEmail || null,
    action: args.action,
    resource: args.resource,
    resource_id: args.resourceId || null,
    details: args.details || null,
  });
  if (error) console.error("audit log failed", error.message);
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function startOfNextUtcDay(date = new Date()) {
  const next = startOfUtcDay(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfNextUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

type ApiDateRange = {
  dateFrom: string;
  dateTo: string;
  fromIso: string;
  toExclusiveIso: string;
  previousFromIso: string;
  previousToExclusiveIso: string;
};

function parseDateInput(value: string | null, fallback: string) {
  const candidate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
  const date = new Date(`${candidate}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : candidate;
}

function apiDateRange(request: Request): ApiDateRange {
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

function messageTime(message: { sent_at?: string | null; created_at?: string | null }) {
  return message.sent_at || message.created_at || "";
}

function periodStats(leads: Array<{ id: string }>, messages: Array<{ status: string; sent_at?: string | null; delivered_at?: string | null; opened_at?: string | null; replied_at?: string | null; bounced_at?: string | null; spam_at?: string | null; sequence_step?: number | null }>): PeriodStats {
  const sentLike = (message: (typeof messages)[number]) => Boolean(message.sent_at) || ["sent", "delivered", "opened", "replied", "follow_up_sent"].includes(message.status);
  const deliveredLike = (message: (typeof messages)[number]) => sentLike(message) || Boolean(message.delivered_at);
  return {
    leads: leads.length,
    sent: messages.filter(sentLike).length,
    delivered: messages.filter(deliveredLike).length,
    opened: messages.filter((message) => Boolean(message.opened_at) || ["opened", "replied"].includes(message.status)).length,
    replied: messages.filter((message) => message.status === "replied" || Boolean(message.replied_at)).length,
    bounced: messages.filter((message) => message.status === "bounced" || Boolean(message.bounced_at)).length,
    spam: messages.filter((message) => message.status === "spam" || Boolean(message.spam_at)).length,
    followUps: messages.filter((message) => message.status === "follow_up_sent" || Number(message.sequence_step || 0) > 0).length,
  };
}

function trends(current: PeriodStats, previous: PeriodStats) {
  return Object.fromEntries(
    (Object.keys(current) as Array<keyof PeriodStats>).map((key) => {
      const before = previous[key];
      if (!before) return [key, current[key] ? 100 : null];
      return [key, Math.round(((current[key] - before) / before) * 1000) / 10];
    }),
  );
}

function buildChartData(range: ApiDateRange, messages: Array<{ status: string; sent_at?: string | null; created_at?: string | null }>): ChartPoint[] {
  const formatter = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short" });
  const start = new Date(range.fromIso);
  const end = new Date(range.toExclusiveIso);
  const points: ChartPoint[] = [];
  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10);
    const dayMessages = messages.filter((message) => messageTime(message).slice(0, 10) === key);
    points.push({
      label: formatter.format(cursor).replace(".", ""),
      value: dayMessages.length,
      secondary: dayMessages.filter((message) => message.status === "replied").length,
    });
  }
  return points;
}


async function countSentInRange(fromIso: string, toIso: string) {
  const { count, error } = await adminDb()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", fromIso)
    .lt("sent_at", toIso)
    .in("status", SENT_COUNT_STATUSES as unknown as string[]);
  if (error) throw error;
  return count || 0;
}

function readCampaignUsageTargets(campaigns: Campaign[], clients: ClientAccount[]) {
  const clientById = new Map(clients.map((client) => [client.id, client]));
  let totalDailyTarget = 0;
  let totalMonthlyTarget = 0;
  let activeCampaignsWithLimits = 0;
  let campaignsMissingLimits = 0;

  for (const campaign of campaigns.filter((item) => item.status === "active")) {
    const client = campaign.client_id ? clientById.get(campaign.client_id) : null;
    if (!client) {
      campaignsMissingLimits += 1;
      continue;
    }
    try {
      const dailyLimit = effectiveDailySendLimit(client, campaign);
      const monthlyLimit = describeMonthlyLimit(client, campaign).limit;
      totalDailyTarget += dailyLimit;
      totalMonthlyTarget += monthlyLimit;
      activeCampaignsWithLimits += 1;
    } catch {
      campaignsMissingLimits += 1;
    }
  }

  return { totalDailyTarget, totalMonthlyTarget, activeCampaignsWithLimits, campaignsMissingLimits };
}

async function readCampaignUsageSummary(campaigns: Campaign[], clients: ClientAccount[]) {
  const now = new Date();
  const dayStart = startOfUtcDay(now).toISOString();
  const dayEnd = startOfNextUtcDay(now).toISOString();
  const monthStart = startOfUtcMonth(now).toISOString();
  const monthEnd = startOfNextUtcMonth(now).toISOString();
  const [sentToday, sentThisMonth] = await Promise.all([
    countSentInRange(dayStart, dayEnd),
    countSentInRange(monthStart, monthEnd),
  ]);
  const targets = readCampaignUsageTargets(campaigns, clients);
  return {
    sentToday,
    sentThisMonth,
    ...targets,
    dailyRemaining: Math.max(targets.totalDailyTarget - sentToday, 0),
    monthlyRemaining: Math.max(targets.totalMonthlyTarget - sentThisMonth, 0),
  };
}

async function readSendQueueSummary() {
  const db = adminDb();
  const dayStart = startOfUtcDay().toISOString();
  const dayEnd = startOfNextUtcDay().toISOString();
  const [nextSend, todayRows] = await Promise.all([
    db
      .from("send_queue")
      .select("scheduled_at")
      .eq("status", "pending")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    db
      .from("send_queue")
      .select("id,status")
      .gte("scheduled_at", dayStart)
      .lt("scheduled_at", dayEnd)
      .in("status", ["awaiting_approval", "pending", "processing", "sent", "failed", "cancelled"])
      .limit(5000),
  ]);
  if (nextSend.error) throw nextSend.error;
  if (todayRows.error) throw todayRows.error;

  const rows = todayRows.data || [];
  return {
    nextSendAt: nextSend.data?.scheduled_at || null,
    todayTotal: rows.length,
    pending: rows.filter((row) => row.status === "pending").length,
    processing: rows.filter((row) => row.status === "processing").length,
    sent: rows.filter((row) => row.status === "sent").length,
    failed: rows.filter((row) => row.status === "failed").length,
  };
}


type NotificationSeed = {
  clients: any[];
  campaigns: any[];
  leads: any[];
  sendQueue: any[];
  runLogs: any[];
};

function buildAdminNotifications(seed: NotificationSeed) {
  const notifications: Array<{ id: string; tone: "info" | "warning" | "danger" | "success"; title: string; message: string; resource?: string | null; resourceId?: string | null; createdAt?: string | null }> = [];

  for (const client of seed.clients) {
    const hasSmtp = Boolean(client.smtp_host && client.smtp_user && client.smtp_pass_last4);
    if (!hasSmtp) {
      notifications.push({
        id: `smtp-${client.id}`,
        tone: "warning",
        title: "Brak pełnej konfiguracji SMTP",
        message: `${client.company_name} nie ma pełnego SMTP albo hasła aplikacji. Kampanie mogą nie wysyłać maili.`,
        resource: "client_accounts",
        resourceId: client.id,
        createdAt: client.created_at,
      });
    }
  }

  const failedQueue = seed.sendQueue.filter((item) => item.status === "failed");
  if (failedQueue.length) {
    notifications.push({
      id: "queue-failed",
      tone: "danger",
      title: "Nieudane wysyłki w kolejce",
      message: `${failedQueue.length} rekordów kolejki ma status failed. Sprawdź zakładkę Kolejka i błędy SMTP.`,
      resource: "send_queue",
      resourceId: failedQueue[0]?.id || null,
      createdAt: failedQueue[0]?.created_at || null,
    });
  }

  for (const campaign of seed.campaigns.filter((item) => item.status === "active")) {
    const campaignLeadCount = seed.leads.filter((lead) => lead.campaign_id === campaign.id).length;
    const hasRecentNoLeadLog = seed.runLogs.some((log) => log.campaign_id === campaign.id && ["no_email", "low_score", "target_filter", "duplicate", "blacklist"].includes(log.stage));
    if (campaignLeadCount === 0 && hasRecentNoLeadLog) {
      notifications.push({
        id: `no-leads-${campaign.id}`,
        tone: "warning",
        title: "Kampania nie ma wysłanych leadów w tym okresie",
        message: `${campaign.name} filtruje firmy, ale nie zapisuje wysłanych leadów. Sprawdź target, lokalizacje, email finder i logi.`,
        resource: "campaigns",
        resourceId: campaign.id,
        createdAt: campaign.created_at,
      });
    }
  }

  const smtpErrors = seed.runLogs.filter((log) => /smtp|auth|login|password|hasło|535|credentials/i.test(`${log.message || ""} ${JSON.stringify(log.metadata || {})}`));
  if (smtpErrors.length) {
    notifications.push({
      id: "smtp-errors",
      tone: "danger",
      title: "Wykryto błędy SMTP",
      message: `${smtpErrors.length} logów wskazuje na problem SMTP/autoryzacji. Sprawdź hasła aplikacji i połączenia klientów.`,
      resource: "run_logs",
      resourceId: smtpErrors[0]?.id || null,
      createdAt: smtpErrors[0]?.created_at || null,
    });
  }

  if (!notifications.length) {
    notifications.push({
      id: "all-good",
      tone: "success",
      title: "System wygląda czysto",
      message: "Brak krytycznych alertów w wybranym okresie. Kolejka, SMTP i kampanie nie zgłaszają oczywistych problemów.",
      createdAt: new Date().toISOString(),
    });
  }

  return notifications.slice(0, 12);
}

async function readAdminData(range: ApiDateRange) {
  const db = adminDb();
  const [bots, clients, campaigns, leads, previousLeads, messages, previousMessages, campaignRuns, runLogs, suppressionList, auditLogs, signupOrders, signupOrderAttachments, campaignAttachments, sendQueue, adminNotificationRows, sendQueueSummary] = await Promise.all([
    db.from("bots").select("id,name,status,provider,model,max_parallel_campaigns,notes,api_key_last4,has_api_key,created_at,campaigns(id,name,status)").order("created_at", { ascending: false }),
    db.from("client_accounts").select(CLIENT_SAFE_SELECT).order("created_at", { ascending: false }),
    db.from("campaigns").select("*, client_accounts(company_name)").order("created_at", { ascending: false }),
    db
      .from("leads")
      .select("*, client_accounts(company_name), campaigns(name)")
      .eq("status", "sent")
      .not("email", "is", null)
      .gte("created_at", range.fromIso)
      .lt("created_at", range.toExclusiveIso)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("leads")
      .select("id,status,created_at")
      .eq("status", "sent")
      .not("email", "is", null)
      .gte("created_at", range.previousFromIso)
      .lt("created_at", range.previousToExclusiveIso)
      .limit(5000),
    db
      .from("messages")
      .select("*, client_accounts(company_name), campaigns(name), leads(company_name)")
      .in("status", VISIBLE_MESSAGE_STATUSES as unknown as string[])
      .gte("sent_at", range.fromIso)
      .lt("sent_at", range.toExclusiveIso)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("messages")
      .select("id,status,sent_at,delivered_at,opened_at,replied_at,bounced_at,spam_at,sequence_step,created_at")
      .in("status", VISIBLE_MESSAGE_STATUSES as unknown as string[])
      .gte("sent_at", range.previousFromIso)
      .lt("sent_at", range.previousToExclusiveIso)
      .limit(5000),
    db
      .from("campaign_runs")
      .select("*, client_accounts(company_name), campaigns(name)")
      .gte("started_at", range.fromIso)
      .lt("started_at", range.toExclusiveIso)
      .order("started_at", { ascending: false })
      .limit(100),
    db
      .from("run_logs")
      .select("*, client_accounts(company_name), campaigns(name)")
      .gte("created_at", range.fromIso)
      .lt("created_at", range.toExclusiveIso)
      .order("created_at", { ascending: false })
      .limit(300),
    db
      .from("suppression_list")
      .select("*, client_accounts(company_name)")
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("signup_orders")
      .select(SIGNUP_ORDER_SAFE_SELECT)
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("signup_order_attachments")
      .select(SIGNUP_ORDER_ATTACHMENT_SAFE_SELECT)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("campaign_attachments")
      .select(CAMPAIGN_ATTACHMENT_SAFE_SELECT)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("send_queue")
      .select("id,client_id,campaign_id,scheduled_at,status,email_to,subject,kind,parent_message_id,lead_id,attempts,last_error,locked_at,processed_at,created_at, client_accounts(company_name), campaigns(name)")
      .in("status", ["awaiting_approval", "pending", "processing", "sent", "failed", "cancelled"])
      .or(`scheduled_at.gte.${range.fromIso},status.in.(awaiting_approval,pending,processing,failed)`)
      .order("scheduled_at", { ascending: true })
      .limit(500),
    db
      .from("admin_notifications")
      .select("id,tone,title,message,resource,resource_id,status,created_at")
      .in("status", ["unread", "read"])
      .order("created_at", { ascending: false })
      .limit(50),
    readSendQueueSummary(),
  ]);

  const error = bots.error || clients.error || campaigns.error || leads.error || previousLeads.error || messages.error || previousMessages.error || campaignRuns.error || runLogs.error || suppressionList.error || auditLogs.error || signupOrders.error || signupOrderAttachments.error || campaignAttachments.error || sendQueue.error || adminNotificationRows.error;
  if (error) throw error;

  const usageSummary = await readCampaignUsageSummary((campaigns.data || []) as unknown as Campaign[], (clients.data || []) as unknown as ClientAccount[]);
  const currentStats = periodStats(leads.data || [], messages.data || []);
  const previousPeriodStats = periodStats(previousLeads.data || [], previousMessages.data || []);

  return {
    bots: bots.data || [],
    clients: clients.data || [],
    campaigns: campaigns.data || [],
    leads: leads.data || [],
    messages: messages.data || [],
    campaignRuns: campaignRuns.data || [],
    runLogs: runLogs.data || [],
    suppressionList: suppressionList.data || [],
    auditLogs: auditLogs.data || [],
    signupOrders: signupOrders.data || [],
    signupOrderAttachments: signupOrderAttachments.data || [],
    campaignAttachments: campaignAttachments.data || [],
    sendQueue: sendQueue.data || [],
    sendQueueSummary,
    usageSummary,
    adminNotifications: [
      ...(adminNotificationRows.data || []).map((item: any) => ({
        id: item.id,
        tone: item.tone || "info",
        title: item.title,
        message: item.message,
        resource: item.resource,
        resourceId: item.resource_id,
        createdAt: item.created_at,
        status: item.status,
      })),
      ...buildAdminNotifications({
        clients: clients.data || [],
        campaigns: campaigns.data || [],
        leads: leads.data || [],
        sendQueue: sendQueue.data || [],
        runLogs: runLogs.data || [],
      }),
    ].slice(0, 20),
    dateRange: { dateFrom: range.dateFrom, dateTo: range.dateTo },
    chartData: buildChartData(range, messages.data || []),
    previousPeriodStats,
    trends: trends(currentStats, previousPeriodStats),
  };
}

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    return NextResponse.json(await readAdminData(apiDateRange(request)), { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd odczytu danych."), 500);
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const body = await request.json();
    const resource = body?.resource;
    const action = body?.action;
    const payload = body?.payload;

    if (!isResource(resource)) return jsonError("Nieobsługiwany zasób.", 400);

    if (action === "create") {
      let createdId: string | null = null;
      if (resource === "bots") {
        const validation = validateBotPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        const { data, error } = await adminDb().from("bots").insert(botPayloadToDb(validation.data, "create")).select("id").single();
        if (error) throw error;
        createdId = data?.id || null;
        await audit({ actorEmail: auth.user.email, action: "create", resource, resourceId: data?.id, details: { name: validation.data.name } });
      } else if (resource === "client_accounts") {
        const validation = validateClientPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        const { data, error } = await adminDb().from("client_accounts").insert(clientPayloadToDb(validation.data)).select("id").single();
        if (error) throw error;
        createdId = data?.id || null;
        await audit({ actorEmail: auth.user.email, action: "create", resource, resourceId: data?.id, details: { company_name: validation.data.company_name } });
      } else if (resource === "campaigns") {
        const validation = validateCampaignPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        await ensureBotCapacity(validation.data);
        const { data, error } = await adminDb().from("campaigns").insert(validation.data).select("id").single();
        if (error) throw error;
        createdId = data?.id || null;
        await audit({ actorEmail: auth.user.email, action: "create", resource, resourceId: data?.id, details: { name: validation.data.name } });
      } else if (resource === "leads") {
        const validation = validateLeadPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        const { data, error } = await adminDb().from("leads").insert(validation.data).select("id").single();
        if (error) throw error;
        createdId = data?.id || null;
        await audit({ actorEmail: auth.user.email, action: "create", resource, resourceId: data?.id, details: { company_name: validation.data.company_name } });
      } else if (resource === "suppression_list") {
        const validation = validateSuppressionPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        const { data, error } = await adminDb().from("suppression_list").insert(validation.data).select("id").single();
        if (error) throw error;
        createdId = data?.id || null;
        await audit({ actorEmail: auth.user.email, action: "create", resource, resourceId: data?.id, details: validation.data });
      } else if (resource === "send_queue") {
        return jsonError("Kolejka jest tworzona przez planner i follow-upy.", 400);
      } else {
        return jsonError("Wiadomości są tworzone przez runner kampanii.", 400);
      }

      return NextResponse.json({ ok: true, id: createdId }, { headers: noStoreHeaders });
    }

    if (action === "update") {
      const idValidation = validateRecordId(body?.id);
      if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

      if (resource === "bots") {
        const validation = validateBotPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        const { error } = await adminDb().from("bots").update(botPayloadToDb(validation.data, "update")).eq("id", idValidation.data);
        if (error) throw error;
      } else if (resource === "client_accounts") {
        const validation = validateClientPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        const { error } = await adminDb().from("client_accounts").update(clientPayloadToDb(validation.data)).eq("id", idValidation.data);
        if (error) throw error;
      } else if (resource === "campaigns") {
        const validation = validateCampaignPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        await ensureBotCapacity(validation.data, idValidation.data);
        const { error } = await adminDb().from("campaigns").update(validation.data).eq("id", idValidation.data);
        if (error) throw error;
      } else if (resource === "leads") {
        const validation = validateLeadPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        const { error } = await adminDb().from("leads").update(validation.data).eq("id", idValidation.data);
        if (error) throw error;
      } else if (resource === "messages") {
        const validation = validateMessagePayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        const { error } = await adminDb().from("messages").update(validation.data).eq("id", idValidation.data);
        if (error) throw error;
      } else if (resource === "suppression_list") {
        const validation = validateSuppressionPayload(payload);
        if (!validation.ok) return jsonError(validation.errors.join(" "), 400);
        const { error } = await adminDb().from("suppression_list").update(validation.data).eq("id", idValidation.data);
        if (error) throw error;
      } else if (resource === "send_queue") {
        return jsonError("Użyj akcji ponowienia albo anulowania kolejki.", 400);
      }
      await audit({ actorEmail: auth.user.email, action: "update", resource, resourceId: idValidation.data });
      return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
    }

    if (action === "delete") {
      const idValidation = validateRecordId(body?.id);
      if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);
      if (resource === "send_queue") return jsonError("Rekordy kolejki anuluj zamiast usuwać.", 400);

      if (resource === "campaign_runs") {
        await adminDb().from("run_logs").delete().eq("run_id", idValidation.data);
        const { error } = await adminDb().from("campaign_runs").delete().eq("id", idValidation.data);
        if (error) throw error;
        await audit({ actorEmail: auth.user.email, action: "delete", resource, resourceId: idValidation.data });
        return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
      }

      if (resource === "bots") {
        const { count, error: activeCampaignsError } = await adminDb()
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("bot_id", idValidation.data)
          .eq("status", "active");
        if (activeCampaignsError) throw activeCampaignsError;
        if ((count || 0) > 0) {
          return jsonError("Nie można usunąć bota, który ma aktywne kampanie. Najpierw wstrzymaj kampanie albo przypisz innego bota.", 409);
        }
      }

      const { error } = await adminDb().from(resource).delete().eq("id", idValidation.data);
      if (error) throw error;
      await audit({ actorEmail: auth.user.email, action: "delete", resource, resourceId: idValidation.data });
      return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
    }

    if (action === "updateStatus") {
      const idValidation = validateRecordId(body?.id);
      if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

      const validation = validateStatusPatch(resource, payload);
      if (!validation.ok) return jsonError(validation.errors.join(" "), 400);

      if (resource === "campaigns" && "status" in validation.data && validation.data.status === "active") {
        const { data: campaign, error: campaignError } = await adminDb()
          .from("campaigns")
          .select("id,bot_id,status")
          .eq("id", idValidation.data)
          .single();
        if (campaignError) throw campaignError;
        await ensureBotCapacity({ bot_id: campaign?.bot_id || null, status: "active" }, idValidation.data);
      }

      if (resource === "messages" && "status" in validation.data) {
        await applyMessageStatus(idValidation.data, validation.data.status as never);
      } else if (resource === "send_queue" && "status" in validation.data) {
        const nextStatus = validation.data.status;
        const patch =
          nextStatus === "pending"
            ? { status: "pending", scheduled_at: new Date().toISOString(), attempts: 0, locked_at: null, locked_by: null, processed_at: null, last_error: null }
            : { status: "cancelled", locked_at: null, locked_by: null, processed_at: new Date().toISOString() };
        const query = adminDb().from("send_queue").update(patch).eq("id", idValidation.data);
        const { error } = nextStatus === "cancelled" ? await query.eq("status", "pending") : await query.in("status", ["failed", "processing"]);
        if (error) throw error;
      } else {
        const { error } = await adminDb().from(resource).update(validation.data).eq("id", idValidation.data);
        if (error) throw error;
      }
      await audit({ actorEmail: auth.user.email, action: "status", resource, resourceId: idValidation.data, details: validation.data });
      return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
    }

    return jsonError("Nieobsługiwana akcja.", 400);
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd zapisu danych."), 500);
  }
}
