import "server-only";

import crypto from "crypto";

import { generateLeadWithAi } from "@/lib/bot/aiLead";
import { isWeekendInTimeZone, nextBusinessDayAtHour } from "@/lib/bot/businessDays";
import { findBusinessEmail } from "@/lib/bot/emailFinder";
import { searchGooglePlaces, type PlaceLead } from "@/lib/bot/googlePlaces";
import { expandCampaignLocations, languageForLocation } from "@/lib/bot/locationPresets";
import { getSendCapacity } from "@/lib/bot/sendSafety";
import { domainKey, toList, unique } from "@/lib/bot/utils";
import { auditWebsite } from "@/lib/bot/websiteAudit";
import { decryptSecret } from "@/lib/cryptoSecrets";
import { getBotSecrets } from "@/lib/secretStore";
import { acquireSystemLock, releaseSystemLock } from "@/lib/bot/runLock";
import { adminDb } from "@/lib/supabaseAdmin";
import type { Campaign, ClientAccount, LogLevel } from "@/lib/types";

type ClientWithMailSecrets = ClientAccount & {
  smtp_pass_encrypted?: string | null;
  smtp_pass_iv?: string | null;
  smtp_pass_auth_tag?: string | null;
};

type CampaignWithClient = Campaign & { client_accounts: ClientWithMailSecrets | null };

type BotApiSecrets = {
  id: string;
  name: string;
  provider?: string | null;
  model?: string | null;
  api_key_encrypted?: string | null;
  api_key_iv?: string | null;
  api_key_auth_tag?: string | null;
};

export type DailyPlanStats = {
  searchedQueries: number;
  foundPlaces: number;
  skippedDuplicates: number;
  missingEmail: number;
  emailsFound: number;
  queuedEmails: number;
  queueFailures: number;
  errors: string[];
  dailyLimit: number;
  alreadyQueuedToday: number;
  plannedTarget: number;
};

function emptyStats(): DailyPlanStats {
  return {
    searchedQueries: 0,
    foundPlaces: 0,
    skippedDuplicates: 0,
    missingEmail: 0,
    emailsFound: 0,
    queuedEmails: 0,
    queueFailures: 0,
    errors: [],
    dailyLimit: 0,
    alreadyQueuedToday: 0,
    plannedTarget: 0,
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function botApiConfig(botId?: string | null) {
  if (!botId) return { openaiKey: null as string | null, model: null as string | null, source: "global" as const };
  const { data, error } = await adminDb()
    .from("bots")
    .select("id,name,provider,model,api_key_encrypted,api_key_iv,api_key_auth_tag")
    .eq("id", botId)
    .single<BotApiSecrets>();
  if (error || !data) return { openaiKey: null as string | null, model: null as string | null, source: "global" as const };
  if (data.api_key_encrypted && data.api_key_iv && data.api_key_auth_tag) {
    return {
      openaiKey: decryptSecret({ encrypted_value: data.api_key_encrypted, iv: data.api_key_iv, auth_tag: data.api_key_auth_tag }),
      model: data.model || null,
      source: "bot" as const,
    };
  }
  return { openaiKey: null as string | null, model: data.model || null, source: "global" as const };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function requiredPanelNumber(value: unknown, label: string) {
  if (value === null || value === undefined || String(value).trim() === "") {
    throw new Error(`${label} nie jest ustawione w panelu kampanii. Uzupełnij to pole i zapisz kampanię.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} ma niepoprawną wartość w panelu kampanii.`);
  }
  return parsed;
}

function requiredPanelInt(value: unknown, label: string, min: number, max: number) {
  const parsed = Math.round(requiredPanelNumber(value, label));
  if (parsed < min || parsed > max) {
    throw new Error(`${label} musi być w zakresie ${min}-${max}. Popraw wartość w panelu kampanii.`);
  }
  return parsed;
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function nextRunDate(timeZone: string, sendOnWeekends: boolean, startHour: number) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (sendOnWeekends) return zonedDateAtHour(tomorrow, startHour, timeZone).toISOString();
  return nextBusinessDayAtHour(tomorrow, startHour, timeZone).toISOString();
}

function nextUnderTargetRetryDate(args: { timeZone: string; sendOnWeekends: boolean; startHour: number; endHour: number; minutes?: number }) {
  const now = new Date();
  const retryMinutes = clamp(Math.round(args.minutes || 30), 5, 180);
  if (!args.sendOnWeekends && isWeekendInTimeZone(now, args.timeZone)) {
    return nextBusinessDayAtHour(now, args.startHour, args.timeZone).toISOString();
  }

  const todayStart = zonedDateAtHour(now, args.startHour, args.timeZone);
  const todayEnd = zonedDateAtHour(now, args.endHour, args.timeZone);
  if (now.getTime() < todayStart.getTime()) return todayStart.toISOString();

  const retry = new Date(now.getTime() + retryMinutes * 60_000);
  if (retry.getTime() < todayEnd.getTime()) return retry.toISOString();

  return nextRunDate(args.timeZone, args.sendOnWeekends, args.startHour);
}

function workWindowState(args: { timeZone: string; sendOnWeekends: boolean; startHour: number; endHour: number; now?: Date }) {
  const now = args.now || new Date();
  if (!args.sendOnWeekends && isWeekendInTimeZone(now, args.timeZone)) {
    const nextWindowAt = nextBusinessDayAtHour(now, args.startHour, args.timeZone).toISOString();
    return { allowed: false, code: "weekend" as const, nextWindowAt, message: `Weekend: kampania nie szuka leadów i nie wysyła maili. Następne okno pracy: ${nextWindowAt}.` };
  }

  const todayStart = zonedDateAtHour(now, args.startHour, args.timeZone);
  const todayEnd = zonedDateAtHour(now, args.endHour, args.timeZone);
  if (now.getTime() < todayStart.getTime()) {
    const nextWindowAt = todayStart.toISOString();
    return { allowed: false, code: "before_hours" as const, nextWindowAt, message: `Poza godzinami pracy. Następne okno pracy: ${nextWindowAt}.` };
  }
  if (now.getTime() >= todayEnd.getTime()) {
    const nextWindowAt = nextRunDate(args.timeZone, args.sendOnWeekends, args.startHour);
    return { allowed: false, code: "after_hours" as const, nextWindowAt, message: `Po godzinach pracy ${args.startHour}:00-${args.endHour}:00. Następne okno pracy: ${nextWindowAt}.` };
  }

  return { allowed: true, code: "working" as const, nextWindowAt: now.toISOString(), message: "Kampania jest w oknie pracy." };
}

function nextSequentialCampaignRunAt(args: {
  timeZone: string;
  sendOnWeekends: boolean;
  startHour: number;
  endHour: number;
  totalTarget: number;
  alreadyQueuedToday: number;
  sentToday: number;
  clientOffsetMinutes: number;
}) {
  const now = new Date();
  const start = zonedDateAtHour(now, args.startHour, args.timeZone);
  const end = zonedDateAtHour(now, args.endHour, args.timeZone);
  const workMs = Math.max(end.getTime() - start.getTime(), 60_000);
  const intervalMs = Math.max(Math.floor(workMs / Math.max(args.totalTarget, 1)), 60_000);
  const slotIndex = Math.max(args.alreadyQueuedToday + args.sentToday + 1, 1);
  const planned = new Date(start.getTime() + args.clientOffsetMinutes * 60_000 + slotIndex * intervalMs);
  const minimumNext = new Date(now.getTime() + Math.min(intervalMs, 30 * 60_000));
  const next = planned.getTime() > minimumNext.getTime() ? planned : minimumNext;
  if (next.getTime() < end.getTime()) return next.toISOString();
  return nextRunDate(args.timeZone, args.sendOnWeekends, args.startHour);
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function startOfNextUtcDay(date = new Date()) {
  const next = startOfUtcDay(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedDateAtHour(base: Date, hour: number, timeZone: string) {
  const parts = getZonedParts(base, timeZone);
  const guess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, 0, 0, 0));
  const offset = timeZoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

function scheduleTimesForDay(args: {
  count: number;
  totalTarget: number;
  existingOffset: number;
  clientOffsetMinutes: number;
  startHour: number;
  endHour: number;
  timeZone: string;
}) {
  const now = new Date();
  const scheduleBase = now;
  const start = zonedDateAtHour(scheduleBase, args.startHour, args.timeZone);
  const end = zonedDateAtHour(scheduleBase, args.endHour, args.timeZone);
  const workMs = end.getTime() - start.getTime();
  if (workMs <= 0) throw new Error("Okno pracy musi mieć dodatnią długość. Ustaw godzinę końca większą niż godzinę startu.");
  const intervalMs = Math.floor(workMs / Math.max(args.totalTarget, 1));
  if (intervalMs <= 0) throw new Error("Nie da się obliczyć odstępu wysyłki. Zmniejsz dzienny limit albo wydłuż okno pracy.");
  const dates: string[] = [];
  for (let i = 0; i < args.count; i += 1) {
    const slotIndex = args.existingOffset + i;
    const planned = new Date(start.getTime() + args.clientOffsetMinutes * 60_000 + slotIndex * intervalMs);
    const safePlanned = planned.getTime() <= now.getTime() ? new Date(now.getTime() + (i + 1) * 60_000) : planned;
    dates.push(safePlanned.toISOString());
  }
  return { dates, intervalMinutes: Math.round(intervalMs / 60_000), workWindowHours: Math.round(workMs / 36_000) / 100 };
}

type SchedulerCampaignRow = {
  id: string;
  bot_id: string | null;
  client_id: string | null;
  name?: string | null;
  daily_limit: number | null;
  workday_start_hour: number | null;
  workday_end_hour: number | null;
  sending_timezone: string | null;
  send_on_weekends: boolean | null;
  next_run_at: string | null;
  created_at: string | null;
};

type DynamicScheduleProfile = {
  intervalMs: number;
  intervalMinutes: number;
  workWindowMinutes: number;
  minCycleMs: number;
  minCycleMinutes: number;
  staggerMs: number;
  staggerSeconds: number;
  staggerIndex: number;
  activeSchedulerItems: number;
  offsetMs: number;
  offsetSeconds: number;
};

function requiredSchedulerInt(value: unknown, label: string, min: number, max: number) {
  const parsed = Math.round(requiredPanelNumber(value, label));
  if (parsed < min || parsed > max) {
    throw new Error(`${label} musi być w zakresie ${min}-${max}. Popraw wartość w panelu kampanii.`);
  }
  return parsed;
}

function rowTimeZone(row: Pick<SchedulerCampaignRow, "sending_timezone">) {
  const value = String(row.sending_timezone || "").trim();
  if (!value) throw new Error("Strefa czasowa wysyłki nie jest ustawiona w panelu kampanii.");
  return value;
}

function dynamicIntervalForRow(row: Pick<SchedulerCampaignRow, "daily_limit" | "workday_start_hour" | "workday_end_hour" | "sending_timezone">, base = new Date()) {
  const timeZone = rowTimeZone(row);
  const startHour = requiredSchedulerInt(row.workday_start_hour, "Godzina startu pracy bota", 0, 23);
  const endHour = requiredSchedulerInt(row.workday_end_hour, "Godzina końca pracy bota", startHour + 1, 24);
  const dailyTarget = requiredSchedulerInt(row.daily_limit, "Docelowa liczba maili dziennie", 1, 500);
  const start = zonedDateAtHour(base, startHour, timeZone);
  const end = zonedDateAtHour(base, endHour, timeZone);
  const workWindowMs = end.getTime() - start.getTime();
  if (workWindowMs <= 0) throw new Error("Okno pracy musi mieć dodatnią długość. Ustaw godzinę końca większą niż godzinę startu.");
  const intervalMs = Math.floor(workWindowMs / dailyTarget);
  if (intervalMs <= 0) throw new Error("Nie da się obliczyć odstępu wysyłki. Zmniejsz dzienny limit albo wydłuż okno pracy.");
  return { timeZone, startHour, endHour, dailyTarget, workWindowMs, intervalMs };
}

function sortSchedulerRows(rows: SchedulerCampaignRow[]) {
  return [...rows].sort((a, b) => {
    const botA = a.bot_id || "";
    const botB = b.bot_id || "";
    if (botA !== botB) return botA.localeCompare(botB);
    const createdA = a.created_at || "";
    const createdB = b.created_at || "";
    if (createdA !== createdB) return createdA.localeCompare(createdB);
    return a.id.localeCompare(b.id);
  });
}

async function loadActiveSchedulerRows() {
  const { data, error } = await adminDb()
    .from("campaigns")
    .select("id,name,bot_id,client_id,daily_limit,workday_start_hour,workday_end_hour,sending_timezone,send_on_weekends,next_run_at,created_at")
    .eq("status", "active")
    .eq("auto_run_enabled", true);
  if (error) throw error;
  return (data || []) as SchedulerCampaignRow[];
}

const VERCEL_CRON_TICK_MS = 60_000;

function buildDynamicScheduleProfile(campaignId: string, rows: SchedulerCampaignRow[], base = new Date()): DynamicScheduleProfile {
  const valid = sortSchedulerRows(rows).map((row) => ({ row, timing: dynamicIntervalForRow(row, base) }));
  if (!valid.length) throw new Error("Brak aktywnych kampanii do obliczenia harmonogramu.");
  const currentIndex = valid.findIndex((item) => item.row.id === campaignId);
  if (currentIndex < 0) throw new Error("Nie znaleziono kampanii w aktywnym harmonogramie.");
  const minCycleMs = Math.min(...valid.map((item) => item.timing.intervalMs));
  const staggerMs = Math.floor(minCycleMs / valid.length);
  if (staggerMs < VERCEL_CRON_TICK_MS) {
    const minCycleMinutes = Math.round(minCycleMs / 60_000);
    const maxStableCampaigns = Math.max(Math.floor(minCycleMs / VERCEL_CRON_TICK_MS), 1);
    throw new Error(`Za dużo aktywnych kampanii/botów na jeden worker Vercel Pro. Najmniejszy cykl ma ${minCycleMinutes} min, aktywnych elementów jest ${valid.length}, więc odstęp wynosi ${Math.round(staggerMs / 1000)} s. Vercel Cron odpala najczęściej co 60 s, dlatego stabilny limit dla tego cyklu to maksymalnie ${maxStableCampaigns} aktywnych kampanii. Zmniejsz liczbę aktywnych kampanii, zmniejsz limity dzienne albo wydłuż okno pracy.`);
  }
  const current = valid[currentIndex];
  return {
    intervalMs: current.timing.intervalMs,
    intervalMinutes: Math.round(current.timing.intervalMs / 60_000),
    workWindowMinutes: Math.round(current.timing.workWindowMs / 60_000),
    minCycleMs,
    minCycleMinutes: Math.round(minCycleMs / 60_000),
    staggerMs,
    staggerSeconds: Math.round(staggerMs / 1000),
    staggerIndex: currentIndex,
    activeSchedulerItems: valid.length,
    offsetMs: currentIndex * staggerMs,
    offsetSeconds: Math.round((currentIndex * staggerMs) / 1000),
  };
}

function nextDynamicSlot(args: {
  base?: Date;
  timeZone: string;
  sendOnWeekends: boolean;
  startHour: number;
  endHour: number;
  intervalMs: number;
  offsetMs: number;
  strictlyAfter?: boolean;
}) {
  const now = args.base || new Date();
  if (!args.sendOnWeekends && isWeekendInTimeZone(now, args.timeZone)) {
    return new Date(nextBusinessDayAtHour(now, args.startHour, args.timeZone).getTime() + args.offsetMs);
  }

  const start = zonedDateAtHour(now, args.startHour, args.timeZone);
  const end = zonedDateAtHour(now, args.endHour, args.timeZone);
  const anchor = new Date(start.getTime() + args.offsetMs);

  if (now.getTime() < anchor.getTime() || (!args.strictlyAfter && now.getTime() === anchor.getTime())) return anchor;
  if (now.getTime() >= end.getTime()) return new Date(new Date(nextRunDate(args.timeZone, args.sendOnWeekends, args.startHour)).getTime() + args.offsetMs);

  const elapsed = now.getTime() - anchor.getTime();
  const slotsPassed = Math.floor(elapsed / args.intervalMs) + 1;
  const next = new Date(anchor.getTime() + slotsPassed * args.intervalMs);
  if (next.getTime() < end.getTime()) return next;
  return new Date(new Date(nextRunDate(args.timeZone, args.sendOnWeekends, args.startHour)).getTime() + args.offsetMs);
}

async function dynamicScheduleForCampaign(campaign: CampaignWithClient, options: { strictlyAfter?: boolean } = {}) {
  const rows = await loadActiveSchedulerRows();
  const profile = buildDynamicScheduleProfile(campaign.id, rows);
  const timing = dynamicIntervalForRow(campaign);
  const nextRunAt = nextDynamicSlot({
    timeZone: timing.timeZone,
    sendOnWeekends: campaign.send_on_weekends === true,
    startHour: timing.startHour,
    endHour: timing.endHour,
    intervalMs: profile.intervalMs,
    offsetMs: profile.offsetMs,
    strictlyAfter: options.strictlyAfter === true,
  });
  return { ...profile, nextRunAt: nextRunAt.toISOString(), timeZone: timing.timeZone, startHour: timing.startHour, endHour: timing.endHour, dailyTarget: timing.dailyTarget };
}

async function normalizeDynamicCampaignSchedule() {
  const rows = await loadActiveSchedulerRows();
  if (!rows.length) return { normalized: 0, activeSchedulerItems: 0, minCycleMinutes: null as number | null, staggerSeconds: null as number | null };
  const profiles = rows.map((row) => ({ row, profile: buildDynamicScheduleProfile(row.id, rows) }));
  const now = new Date();
  let normalized = 0;
  for (const item of profiles) {
    if (item.row.next_run_at) continue;
    const timing = dynamicIntervalForRow(item.row, now);
    const nextRunAt = nextDynamicSlot({
      base: now,
      timeZone: timing.timeZone,
      sendOnWeekends: item.row.send_on_weekends === true,
      startHour: timing.startHour,
      endHour: timing.endHour,
      intervalMs: item.profile.intervalMs,
      offsetMs: item.profile.offsetMs,
      strictlyAfter: false,
    }).toISOString();
    await adminDb().from("campaigns").update({ next_run_at: nextRunAt }).eq("id", item.row.id).is("next_run_at", null);
    normalized += 1;
  }
  return {
    normalized,
    activeSchedulerItems: rows.length,
    minCycleMinutes: profiles[0]?.profile.minCycleMinutes ?? null,
    staggerSeconds: profiles[0]?.profile.staggerSeconds ?? null,
  };
}

async function acquireCampaignLock(campaignId: string) {
  const lockId = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiredAt = new Date(Date.now() - 1000 * 60 * 30).toISOString();
  const { data, error } = await adminDb()
    .from("campaigns")
    .update({ locked_at: now, locked_by: lockId })
    .eq("id", campaignId)
    .or(`locked_at.is.null,locked_at.lt.${expiredAt}`)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Kampania jest już planowana albo ma aktywną blokadę.");
  return lockId;
}

async function releaseCampaignLock(campaignId: string, lockId: string | null) {
  if (!lockId) return;
  const { error } = await adminDb().from("campaigns").update({ locked_at: null, locked_by: null }).eq("id", campaignId).eq("locked_by", lockId);
  if (error) console.error("campaign lock release failed", error.message);
}

async function createRun(campaign: CampaignWithClient) {
  const { data, error } = await adminDb()
    .from("campaign_runs")
    .insert({ client_id: campaign.client_id, campaign_id: campaign.id, status: "running" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function finishRun(runId: string | null, stats: DailyPlanStats, status: "completed" | "failed" | "partial") {
  if (!runId) return;
  await adminDb()
    .from("campaign_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      searched_queries: stats.searchedQueries,
      found_places: stats.foundPlaces,
      skipped_duplicates: stats.skippedDuplicates,
      inserted_leads: 0,
      emails_found: stats.emailsFound,
      drafts_created: stats.queuedEmails,
      sent_emails: 0,
      send_failures: stats.queueFailures,
      errors: stats.errors,
    })
    .eq("id", runId);
}

async function logRun(args: {
  runId: string | null;
  campaign: CampaignWithClient;
  leadId?: string | null;
  level?: LogLevel;
  stage: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await adminDb().from("run_logs").insert({
    run_id: args.runId,
    client_id: args.campaign.client_id,
    campaign_id: args.campaign.id,
    lead_id: args.leadId || null,
    level: args.level || "info",
    stage: args.stage,
    message: args.message,
    metadata: args.metadata || null,
  });
  if (error) console.error("run_logs insert failed", error.message);
}

function zonedDayBounds(timeZone: string, date = new Date()) {
  const parts = getZonedParts(date, timeZone);
  const startGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  const start = new Date(startGuess.getTime() - timeZoneOffsetMs(startGuess, timeZone));
  const nextGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0, 0));
  const end = new Date(nextGuess.getTime() - timeZoneOffsetMs(nextGuess, timeZone));
  return { start, end };
}

async function countQueuedToday(clientId: string, timeZone: string, campaignId?: string | null) {
  const bounds = zonedDayBounds(timeZone);
  let query = adminDb()
    .from("send_queue")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("scheduled_at", bounds.start.toISOString())
    .lt("scheduled_at", bounds.end.toISOString())
    .in("status", ["awaiting_approval", "pending", "processing"]);
  if (campaignId) query = query.eq("campaign_id", campaignId);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function countCampaignSentToday(campaignId: string, timeZone: string) {
  const bounds = zonedDayBounds(timeZone);
  const { count, error } = await adminDb()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .gte("sent_at", bounds.start.toISOString())
    .lt("sent_at", bounds.end.toISOString())
    .in("status", ["sent", "delivered", "opened", "replied"]);
  if (error) throw error;
  return count || 0;
}


async function botUnavailableReason(campaign: CampaignWithClient): Promise<{ stage: string; message: string } | null> {
  if (!campaign.bot_id) {
    return { stage: "no_bot", message: "Kampania nie ma przypisanego bota. Przypisz bota w panelu admina przed uruchomieniem." };
  }
  const db = adminDb();
  const { data: bot, error: botError } = await db
    .from("bots")
    .select("id,name,status,max_parallel_campaigns")
    .eq("id", campaign.bot_id)
    .maybeSingle();
  if (botError) throw botError;
  if (!bot) {
    return { stage: "no_bot", message: "Przypisany bot nie istnieje albo został usunięty. Przypisz kampanii innego bota." };
  }
  if (bot.status === "paused") {
    return { stage: "bot_stopped", message: `Bot ${bot.name} jest zatrzymany ręcznie. Wznów bota w zakładce Boty, aby kampania mogła działać.` };
  }
  if (bot.status === "maintenance") {
    return { stage: "bot_maintenance", message: `Bot ${bot.name} jest w trybie serwisowym. Zmień status bota albo przypisz innego.` };
  }
  if (bot.status !== "active") {
    return { stage: "bot_inactive", message: `Bot ${bot.name} nie jest aktywny. Zmień status bota albo przypisz innego.` };
  }

  const limit = Math.max(Number(bot.max_parallel_campaigns || 1), 1);
  const { data: activeCampaigns, error: campaignsError } = await db
    .from("campaigns")
    .select("id,created_at")
    .eq("bot_id", campaign.bot_id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(limit + 20);
  if (campaignsError) throw campaignsError;

  const rows = activeCampaigns || [];
  const allowedIds = rows.slice(0, limit).map((row) => row.id);
  if (rows.length > limit && !allowedIds.includes(campaign.id)) {
    return { stage: "bot_busy", message: `Bot ${bot.name} ma limit ${limit} aktywnych kampanii i jest już zajęty. Zwiększ limit bota albo przypisz innego.` };
  }
  return null;
}

async function createApprovalDraft(args: { campaign: CampaignWithClient; place: PlaceLead; leadPayload: Record<string, unknown>; email: string; subject: string; body: string; trackingId: string }) {
  const db = adminDb();
  const { campaign, place, leadPayload } = args;
  const { data: lead, error: leadError } = await db
    .from("leads")
    .insert({
      client_id: campaign.client_id,
      campaign_id: campaign.id,
      company_name: String(leadPayload.company_name || place.companyName || "Lead"),
      industry: typeof leadPayload.industry === "string" ? leadPayload.industry : place.industry,
      city: typeof leadPayload.city === "string" ? leadPayload.city : place.city,
      phone: typeof leadPayload.phone === "string" ? leadPayload.phone : place.phone,
      website: typeof leadPayload.website === "string" ? leadPayload.website : place.website,
      email: args.email,
      google_maps_url: typeof leadPayload.google_maps_url === "string" ? leadPayload.google_maps_url : place.googleMapsUrl,
      source: typeof leadPayload.source === "string" ? leadPayload.source : "google_places",
      score: Number(leadPayload.score || 0),
      main_problem: typeof leadPayload.main_problem === "string" ? leadPayload.main_problem : null,
      ai_summary: typeof leadPayload.ai_summary === "string" ? leadPayload.ai_summary : null,
      generated_subject: args.subject,
      generated_email: args.body,
      status: "draft_generated",
    })
    .select("id")
    .single();
  if (leadError) throw leadError;

  const { error: messageError } = await db.from("messages").insert({
    client_id: campaign.client_id,
    campaign_id: campaign.id,
    lead_id: lead.id,
    subject: args.subject,
    body: args.body,
    status: "draft",
    tracking_id: args.trackingId,
    email_to: args.email,
    follow_up_count: 0,
    sequence_step: 0,
  });
  if (messageError) {
    await db.from("leads").delete().eq("id", lead.id);
    throw messageError;
  }
}

async function suppressionMatch(args: { clientId: string; email: string | null; website: string | null; companyName: string }) {
  const domain = domainKey(args.website);
  const companyName = args.companyName.trim().toLowerCase();
  const { data, error } = await adminDb()
    .from("suppression_list")
    .select("id,email,domain,company_name")
    .or(`client_id.eq.${args.clientId},client_id.is.null`)
    .limit(1000);
  if (error) throw error;
  return (data || []).some((item) => {
    const itemEmail = String(item.email || "").toLowerCase();
    const itemDomain = String(item.domain || "").toLowerCase().replace(/^www\./, "");
    const itemCompany = String(item.company_name || "").toLowerCase();
    if (args.email && itemEmail && itemEmail === args.email.toLowerCase()) return true;
    if (domain && itemDomain && itemDomain === domain) return true;
    if (itemCompany && itemCompany === companyName) return true;
    return false;
  });
}

function payloadWebsite(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>).website;
  return typeof value === "string" ? value : null;
}

async function duplicateExists(args: { clientId: string; campaignId: string; companyName: string; googleMapsUrl: string | null; website: string | null; email?: string | null }) {
  const db = adminDb();
  const domain = domainKey(args.website);
  const checks = [
    db.from("leads").select("id").eq("client_id", args.clientId).eq("company_name", args.companyName).limit(1),
  ];
  if (args.googleMapsUrl) checks.push(db.from("leads").select("id").eq("client_id", args.clientId).eq("google_maps_url", args.googleMapsUrl).limit(1));
  if (args.email) {
    checks.push(db.from("leads").select("id").eq("client_id", args.clientId).ilike("email", args.email).limit(1));
    checks.push(db.from("send_queue").select("id").eq("client_id", args.clientId).ilike("email_to", args.email).in("status", ["awaiting_approval", "pending", "processing", "sent"]).limit(1));
  }
  const results = await Promise.all(checks);
  if (results.some((result) => result.error)) throw results.find((result) => result.error)?.error;
  if (results.some((result) => (result.data || []).length > 0)) return true;

  if (domain) {
    const [leadDomains, queued] = await Promise.all([
      db.from("leads").select("id,website").eq("client_id", args.clientId).not("website", "is", null).limit(1000),
      db.from("send_queue").select("id,lead_payload").eq("client_id", args.clientId).in("status", ["awaiting_approval", "pending", "processing", "sent"]).limit(1000),
    ]);
    if (leadDomains.error) throw leadDomains.error;
    if (queued.error) throw queued.error;
    if ((leadDomains.data || []).some((lead) => domainKey(lead.website) === domain)) return true;
    if ((queued.data || []).some((item) => domainKey(payloadWebsite(item.lead_payload)) === domain)) return true;
  }
  return false;
}


function splitSearchText(value: string | null | undefined) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function compactSearchPhrase(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  if (raw.length <= 80) return [raw];
  return splitSearchText(raw).filter((item) => item.length <= 80);
}

function targetBusinessModelTerms(value: string | null | undefined) {
  switch (value) {
    case "local_services":
      return ["usługi lokalne", "lokalna firma usługowa"];
    case "b2b_services":
      return ["usługi B2B", "firma B2B"];
    case "b2c_services":
      return ["usługi dla klientów indywidualnych"];
    case "ecommerce":
      return ["sklep internetowy", "e-commerce"];
    case "production":
      return ["producent", "firma produkcyjna"];
    case "hospitality":
      return ["restauracja", "hotel", "kawiarnia"];
    case "medical_beauty":
      return ["gabinet", "klinika", "salon beauty"];
    case "real_estate":
      return ["nieruchomości", "firma budowlana", "deweloper"];
    default:
      return [];
  }
}

function normalizedLeadText(place: PlaceLead) {
  return [place.companyName, place.industry, place.city, place.phone, place.website, place.googleMapsUrl, place.address, place.primaryType, ...(place.types || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeForTarget(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SEARCH_STOPWORDS = new Set([
  "firm", "firma", "firmy", "ktore", "które", "oraz", "dla", "bez", "nad", "pod", "przy", "jako", "inne", "uslug", "uslugi", "usluga",
  "sportowe", "sportowy", "sportowa", "lokalne", "lokalna", "lokalny", "polska", "polskie", "internetowe", "online", "premium",
  "potrzebuja", "potrzebuje", "organizuja", "prowadza", "oferuja", "zajmuja", "sprzedaja", "szukamy", "klientow", "klienci",
]);

const TARGET_ENTITY_PATTERNS: Array<{ marker: string; aliases: string[] }> = [
  { marker: "klub", aliases: ["klub", "ks ", "mks", "uks", "lks"] },
  { marker: "akadem", aliases: ["akadem"] },
  { marker: "szkol", aliases: ["szkol", "szkolka", "liceum", "technikum"] },
  { marker: "organizac", aliases: ["organizac", "stowarzysz", "fundac", "zwiazek"] },
  { marker: "restaur", aliases: ["restaur"] },
  { marker: "kawiar", aliases: ["kawiar", "cafe"] },
  { marker: "hotel", aliases: ["hotel", "pensjonat", "apartament"] },
  { marker: "warsztat", aliases: ["warsztat", "serwis", "mechanik"] },
  { marker: "gabinet", aliases: ["gabinet", "klinika", "przychodn"] },
  { marker: "salon", aliases: ["salon", "beauty", "kosmetycz"] },
  { marker: "biuro", aliases: ["biuro", "kancelar", "agenc"] },
  { marker: "dewelop", aliases: ["dewelop", "budowlan", "remont"] },
];

function tokenLooksUsefulForSearch(token: string) {
  const normalized = normalizeForTarget(token);
  if (normalized.length < 3) return false;
  if (SEARCH_STOPWORDS.has(normalized)) return false;
  return true;
}

function searchPhraseLooksLikeSentence(value: string) {
  const normalized = normalizeForTarget(value);
  return normalized.split(" ").length > 6 || /\b(potrzeb|ofer|produkuj|sprzedaj|zajmuj|prowadz|organizuj)\w*/i.test(value);
}

function safeSearchPhrases(values: Array<string | null | undefined>) {
  const phrases: string[] = [];
  for (const value of values) {
    for (const phrase of splitSearchText(value)) {
      const trimmed = phrase.trim();
      if (!trimmed) continue;
      if (trimmed.length > 70) continue;
      if (searchPhraseLooksLikeSentence(trimmed)) continue;
      phrases.push(trimmed);
    }
  }
  return phrases;
}

function targetEntityAliases(campaign: CampaignWithClient) {
  const targetSource = normalizeForTarget([
    ...(campaign.target_industries || []),
    campaign.exact_target_business_type,
    campaign.target_audience_niche,
    campaign.search_keywords,
  ].filter(Boolean).join(" "));
  return TARGET_ENTITY_PATTERNS
    .filter((pattern) => targetSource.includes(pattern.marker))
    .flatMap((pattern) => pattern.aliases);
}

function strongTargetTerms(campaign: CampaignWithClient) {
  const rawTerms = [
    ...(campaign.target_industries || []),
    campaign.exact_target_business_type,
    campaign.target_audience_niche,
    campaign.search_keywords,
  ];
  const terms: string[] = [];
  for (const value of rawTerms) {
    for (const phrase of safeSearchPhrases([value])) {
      const normalized = normalizeForTarget(phrase);
      if (!normalized) continue;
      const tokens = normalized.split(" ").filter(tokenLooksUsefulForSearch);
      // Tylko konkretne krótkie frazy. Długie zdania zostawiamy AI, żeby nie odrzucać dobrych leadów zbyt agresywnie.
      if (tokens.length >= 1 && tokens.length <= 4) terms.push(tokens.join(" "));
    }
  }
  return unique(terms).slice(0, 40);
}

function competitorExclusionTerms(campaign: CampaignWithClient) {
  const targetSource = normalizeForTarget([
    ...(campaign.target_industries || []),
    campaign.exact_target_business_type,
    campaign.target_audience_niche,
    campaign.search_keywords,
  ].filter(Boolean).join(" "));
  const offerSource = normalizeForTarget([
    campaign.offer_description,
    campaign.client_business_description,
    campaign.promoted_service,
    campaign.value_proposition,
  ].filter(Boolean).join(" "));
  const terms: string[] = [];

  // Bezpieczne, konserwatywne wykluczenia: używamy ich tylko gdy target wskazuje kupujących,
  // a oferta klienta wskazuje kategorię produktu/usługi. Dzięki temu bot nie pali OpenAI na konkurentów/dostawców.
  if (/\b(klub|akadem|szkolka|szkol|uks|lks|mks|organizac|stowarzysz|fundac|zwiazek)\b/.test(targetSource) && /\b(odziez|odziezy|koszulk|stroj|strojow|sublimac|druk|nadruk)\b/.test(offerSource)) {
    terms.push("sklep sportowy", "hurtownia", "producent odziezy", "odziez sportowa", "drukarnia", "nadruki", "sublimacja", "szwalnia");
  }
  if (/\b(restaur|kawiar|hotel|salon|gabinet|warsztat|biuro)\b/.test(targetSource) && /\b(stron|website|www|marketing|reklam|seo|pozycjon)\b/.test(offerSource)) {
    terms.push("agencja marketingowa", "software house", "tworzenie stron", "strony internetowe", "pozycjonowanie", "seo");
  }
  return unique(terms.map(normalizeForTarget).filter(Boolean));
}

function shouldSkipPlaceByPositiveTarget(campaign: CampaignWithClient, place: PlaceLead) {
  const haystack = normalizeForTarget(normalizedLeadText(place));
  const aliases = unique(targetEntityAliases(campaign));
  if (aliases.length) {
    const matchedAlias = aliases.some((alias) => haystack.includes(normalizeForTarget(alias)));
    if (!matchedAlias) return { skip: true as const, reason: "nie wygląda jak typ firm z pola „Jakich firm szukamy?”" };
    return { skip: false as const, reason: null };
  }

  const positiveTerms = strongTargetTerms(campaign);
  // Gdy admin podał konkretne krótkie targety, Google Places bywa szeroki. Jeżeli żaden z tych targetów
  // nie występuje w nazwie/typie/adresie wyniku, odrzucamy lead przed szukaniem maila i przed OpenAI.
  if (positiveTerms.length >= 1) {
    const matched = positiveTerms.some((term) => haystack.includes(term));
    if (!matched) return { skip: true as const, reason: `brak dopasowania do targetu: ${positiveTerms.slice(0, 5).join(", ")}` };
  }

  return { skip: false as const, reason: null };
}

function requiredSignalTerms(campaign: CampaignWithClient) {
  return unique([
    ...safeSearchPhrases([campaign.must_have_signals, campaign.required_online_signals, campaign.lead_qualification_rules]),
  ].map(normalizeForTarget).filter((term) => term.length >= 3 && term.split(" ").length <= 4));
}

function shouldSkipAfterCheapAudit(campaign: CampaignWithClient, place: PlaceLead, audit: { signals: string[]; problems: string[]; textSample: string }) {
  const terms = requiredSignalTerms(campaign);
  if (!terms.length) return { skip: false as const, reason: null };
  const haystack = normalizeForTarget([
    normalizedLeadText(place),
    audit.signals.join(" "),
    audit.problems.join(" "),
    audit.textSample.slice(0, 2200),
  ].join(" "));
  const matched = terms.some((term) => haystack.includes(term));
  if (!matched) return { skip: true as const, reason: `brak wymaganych sygnałów przed AI: ${terms.slice(0, 5).join(", ")}` };
  return { skip: false as const, reason: null };
}

function shouldSkipPlaceByTarget(campaign: CampaignWithClient, place: PlaceLead) {
  const negativeTerms = unique([
    ...splitSearchText(campaign.negative_keywords),
    ...splitSearchText(campaign.excluded_company_types),
    ...splitSearchText(campaign.lead_disqualification_rules),
  ].map((item) => normalizeForTarget(item)).filter((item) => item.length >= 3));
  const haystack = normalizeForTarget(normalizedLeadText(place));
  const matched = negativeTerms.find((term) => haystack.includes(term));
  if (matched) return { skip: true as const, reason: `pasuje do wykluczenia: ${matched}` };

  // Ważne: oddzielamy KOGO SZUKAMY od TEGO, CO SPRZEDAJEMY.
  // Przykład: jeśli klient sprzedaje odzież klubom, bot ma szukać klubów, a nie producentów odzieży, sklepów z koszulkami czy drukarni.
  const competitorTerms = competitorExclusionTerms(campaign);
  const competitorMatch = competitorTerms.find((term) => haystack.includes(term));
  if (competitorMatch) return { skip: true as const, reason: `wygląda jak dostawca/konkurent zamiast kupujący: ${competitorMatch}` };

  const positiveSkip = shouldSkipPlaceByPositiveTarget(campaign, place);
  if (positiveSkip.skip) return positiveSkip;

  return { skip: false as const, reason: null };
}

function minimumQualifiedLeadScore(campaign?: Pick<Campaign, "min_score"> | null) {
  const campaignScore = Number(campaign?.min_score);
  const fallback = Number(process.env.MIN_QUALIFIED_LEAD_SCORE || 7);
  const raw = Number.isFinite(campaignScore) && campaignScore > 0 ? campaignScore : fallback;
  if (!Number.isFinite(raw)) return 7;
  return clamp(Math.round(raw), 0, 10);
}

function rotateList<T>(items: T[], cursor: number | null | undefined) {
  if (!items.length) return { items, start: 0 };
  const start = Math.abs(Math.round(Number(cursor || 0))) % items.length;
  return { items: [...items.slice(start), ...items.slice(0, start)], start };
}

function expandTargetSearchTerms(terms: string[]) {
  const normalized = normalizeForTarget(terms.join(" "));
  const expanded = [...terms];

  // Dodatkowe frazy są budowane z TARGETU, nie z oferty klienta.
  // To pomaga przy kampaniach typu CLAW SPORT: szukamy klubów/akademii, a nie producentów odzieży.
  if (/\b(klub|akadem|szkolka|szkol|uks|lks|mks)\b/.test(normalized)) {
    expanded.push(
      "klub sportowy",
      "klub piłkarski",
      "akademia piłkarska",
      "szkółka piłkarska",
      "UKS klub sportowy",
      "LKS klub sportowy",
      "MKS klub sportowy",
      "klub siatkarski",
      "klub koszykarski",
      "klub sportów walki",
    );
  }
  if (/\b(szkola|szkol|liceum|technikum)\b/.test(normalized)) {
    expanded.push("szkoła sportowa", "szkoła podstawowa sportowa", "liceum sportowe");
  }
  if (/\b(organizac|stowarzysz|fundac|zwiazek)\b/.test(normalized)) {
    expanded.push("organizacja sportowa", "stowarzyszenie sportowe", "związek sportowy");
  }

  return unique(expanded);
}

function campaignSearchTerms(campaign: CampaignWithClient) {
  // Google Places dostaje wyłącznie opis TARGETU, nie opis oferty.
  // Nie używamy tu pól typu „czym my się zajmujemy”, „jaka oferta” ani długich zdań o potrzebach,
  // bo wtedy bot zaczyna szukać dostawców/producentów zamiast potencjalnych klientów.
  const primaryTerms = safeSearchPhrases([
    ...(campaign.target_industries || []),
    campaign.exact_target_business_type,
    campaign.target_audience_niche,
    campaign.search_keywords,
  ]);
  const fallbackTerms = primaryTerms.length ? [] : targetBusinessModelTerms(campaign.target_business_model);
  const terms = expandTargetSearchTerms([...primaryTerms, ...fallbackTerms])
    .map((item) => item.trim())
    .filter((item) => item && item.split(/\s+/).some(tokenLooksUsefulForSearch));
  return unique(terms).slice(0, 120);
}

function leadPayloadFromPlace(place: PlaceLead, industry: string, location: string, email: string, generated: Awaited<ReturnType<typeof generateLeadWithAi>>, emailSource: string) {
  return {
    company_name: place.companyName,
    industry: place.industry || industry,
    city: place.city || location,
    phone: place.phone,
    website: place.website,
    email,
    google_maps_url: place.googleMapsUrl,
    source: emailSource === "none" ? "google_places" : `google_places+${emailSource}`,
    score: generated.score,
    main_problem: generated.mainProblem,
    ai_summary: generated.aiSummary,
    generated_subject: generated.subject,
    generated_email: generated.body,
  };
}

export async function planCampaignDay(campaignId: string, options: { requestedLimit?: number; force?: boolean } = {}) {
  const db = adminDb();
  const lockId = await acquireCampaignLock(campaignId);
  const stats = emptyStats();
  let runId: string | null = null;
  let campaign: CampaignWithClient | null = null;

  try {
    const { data, error } = await db.from("campaigns").select("*, client_accounts(*)").eq("id", campaignId).single<CampaignWithClient>();
    if (error) throw error;
    if (!data) throw new Error("Nie znaleziono kampanii.");
    campaign = data;
    if (campaign.status !== "active") throw new Error("Kampania nie jest aktywna.");
    if (!campaign.client_accounts) throw new Error("Kampania nie ma przypisanego klienta.");
    if (campaign.client_accounts.subscription_status !== "active") throw new Error("Klient nie ma aktywnej subskrypcji.");

    runId = await createRun(campaign);
    await logRun({ runId, campaign, stage: "start", message: "Start pracy kampanii. Tryb sekwencyjny: bot szuka jednego leada bezpośrednio przed jedną wysyłką." });

    const timeZone = rowTimeZone(campaign);
    const botBlock = await botUnavailableReason(campaign);
    if (botBlock) {
      await logRun({ runId, campaign, level: "warning", stage: botBlock.stage, message: `${botBlock.message} Kampania nie będzie planowana.` });
      await db.from("campaigns").update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunDate(timeZone, campaign.send_on_weekends === true, requiredPanelInt(campaign.workday_start_hour, "Godzina startu pracy bota", 0, 23)),
      }).eq("id", campaign.id);
      await finishRun(runId, stats, "completed");
      return { campaign, stats, runId };
    }

    const secrets = await getBotSecrets();
    if (!secrets.googlePlaces) throw new Error("Brakuje sekretu google_places albo GOOGLE_PLACES_API_KEY.");
    const botApi = await botApiConfig(campaign.bot_id);
    const openaiApiKey = botApi.openaiKey || secrets.openai;
    if (!openaiApiKey) throw new Error("Brakuje API key bota albo globalnego OPENAI_API_KEY.");
    await logRun({ runId, campaign, level: "info", stage: "api_key", message: botApi.source === "bot" ? "AI używa API key przypisanego do bota." : "AI używa globalnego OPENAI_API_KEY." });

    const startHour = requiredPanelInt(campaign.workday_start_hour, "Godzina startu pracy bota", 0, 23);
    const endHour = requiredPanelInt(campaign.workday_end_hour, "Godzina końca pracy bota", startHour + 1, 24);
    const windowState = workWindowState({
      timeZone,
      sendOnWeekends: campaign.send_on_weekends === true,
      startHour,
      endHour,
    });
    if (!options.force && !windowState.allowed) {
      await logRun({ runId, campaign, level: "info", stage: windowState.code, message: windowState.message });
      await db.from("campaigns").update({ last_run_at: new Date().toISOString(), next_run_at: windowState.nextWindowAt }).eq("id", campaign.id);
      await finishRun(runId, stats, "completed");
      return { campaign, stats, runId };
    }
    const rawSearchTerms = campaignSearchTerms(campaign);
    if (!rawSearchTerms.length) throw new Error("Kampania nie ma branż/słów kluczowych do wyszukiwania.");
    const rawLocations = expandCampaignLocations(campaign.target_locations, { max: 800 });
    const rotatedTerms = rotateList(rawSearchTerms, campaign.last_keyword_index ?? campaign.search_cursor);
    const rotatedLocations = rotateList(rawLocations, campaign.last_location_index ?? campaign.search_cursor);
    const searchTerms = rotatedTerms.items;
    const locations = rotatedLocations.items;
    const capacity = await getSendCapacity(campaign.client_accounts, campaign);
    const alreadyQueuedToday = await countQueuedToday(campaign.client_id, timeZone, campaign.id);
    const campaignSentToday = await countCampaignSentToday(campaign.id, timeZone);
    const campaignDailyTarget = clamp(Math.round(Number(options.requestedLimit || requiredPanelNumber(campaign.daily_limit, "Docelowa liczba maili dziennie"))), 1, 500);
    const testModeCap = campaign.test_mode ? 3 : 500;
    const totalTarget = Math.min(campaignDailyTarget, capacity.dailyLimit, capacity.monthlyRemaining, testModeCap);
    const remainingCampaignSlotsToday = Math.max(totalTarget - campaignSentToday - alreadyQueuedToday, 0);
    const remainingPlannedSlotsToday = Math.max(Math.min(capacity.dailyRemaining, capacity.monthlyRemaining, remainingCampaignSlotsToday, testModeCap), 0);
    // Najważniejsza zmiana: planner nie buduje już 50 maili o 06:00.
    // Każde odpalenie crona szuka maksymalnie jednego dobrego kontaktu i dodaje jedną wiadomość do kolejki.
    const availableToday = Math.min(remainingPlannedSlotsToday, 1);

    stats.dailyLimit = capacity.dailyLimit;
    stats.alreadyQueuedToday = alreadyQueuedToday;
    stats.plannedTarget = totalTarget;

    if (availableToday <= 0) {
      await logRun({ runId, campaign, level: "warning", stage: "limits", message: `Brak miejsca w dzisiejszym limicie. Cel kampanii z panelu: ${campaignDailyTarget}, limit warm-up/dzienny: ${capacity.dailyLimit}, wysłane dziś w tej kampanii: ${campaignSentToday}, już w kolejce tej kampanii: ${alreadyQueuedToday}.` });
      const nextLocationIndex = rawLocations.length ? (rotatedLocations.start + Math.max(stats.searchedQueries, 1)) % rawLocations.length : 0;
    const nextKeywordIndex = rawSearchTerms.length ? (rotatedTerms.start + Math.max(1, Math.ceil(stats.searchedQueries / Math.max(rawLocations.length, 1)))) % rawSearchTerms.length : 0;
    await db.from("campaigns").update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunDate(timeZone, campaign.send_on_weekends === true, startHour),
      search_cursor: nextLocationIndex,
      last_location_index: nextLocationIndex,
      last_keyword_index: nextKeywordIndex,
    }).eq("id", campaign.id);
      await finishRun(runId, stats, "completed");
      return { campaign, stats, runId };
    }

    const dynamicSchedule = await dynamicScheduleForCampaign(campaign);
    const schedule = {
      dates: [new Date().toISOString()],
      intervalMinutes: dynamicSchedule.intervalMinutes,
      workWindowHours: dynamicSchedule.workWindowMinutes / 60,
    };
    const searchPairs = unique(searchTerms.flatMap((industry) => locations.map((location) => `${industry}|||${location}`))).slice(0, 1000);
    const perQueryLimit = 10;
    // W trybie sekwencyjnym szukamy tylko do skutku dla jednej wiadomości, bez hurtowego skanowania 50 leadów naraz.
    const placeSearchBudget = Math.max(availableToday * 60, 60);

    await logRun({
      runId,
      campaign,
      stage: "plan",
      message: `Teraz bot szuka maksymalnie 1 kontaktu i po znalezieniu zaplanuje 1 wysyłkę. Okno ${startHour}:00-${endHour}:00, twardy cel ${totalTarget}/dzień, rytm około co ${schedule.intervalMinutes} min.`,
      metadata: { totalTarget, availableToday, alreadyQueuedToday, campaignSentToday, warmupDailyLimit: capacity.dailyLimit, sentToday: capacity.sentToday, sentThisMonth: capacity.sentThisMonth, monthlyLimit: capacity.monthlyLimit, searchTerms, locations: locations.slice(0, 40), totalLocations: rawLocations.length, totalSearchTerms: rawSearchTerms.length, rotatedFromLocation: rotatedLocations.start, rotatedFromKeyword: rotatedTerms.start, timeZone, dynamicSchedule, testMode: campaign.test_mode === true, perQueryLimit, placeSearchBudget },
    });

    let slotIndex = 0;
    for (const pair of searchPairs) {
      if (stats.queuedEmails >= availableToday) break;
      if (stats.foundPlaces >= placeSearchBudget && stats.emailsFound === 0) {
        await logRun({ runId, campaign, level: "warning", stage: "search_budget", message: `Bot sprawdził już ${stats.foundPlaces} firm i nadal nie znalazł emaili. Zatrzymuję szukanie, żeby nie przepalać API. Sprawdź target albo dodaj Google Search CX.` });
        break;
      }
      const [industry, location] = pair.split("|||");
      stats.searchedQueries += 1;
      let places: PlaceLead[] = [];
      try {
        places = await searchGooglePlaces({ apiKey: secrets.googlePlaces, industry, location, limit: perQueryLimit, languageCode: languageForLocation(location) });
        stats.foundPlaces += places.length;
      } catch (error) {
        const message = `${industry} ${location}: ${errorMessage(error, "błąd Google Places")}`;
        stats.errors.push(message);
        await logRun({ runId, campaign, level: "error", stage: "places", message });
        continue;
      }

      for (const place of places) {
        if (stats.queuedEmails >= availableToday) break;
        try {
          const targetSkip = shouldSkipPlaceByTarget(campaign, place);
          if (targetSkip.skip) {
            stats.skippedDuplicates += 1;
            await logRun({ runId, campaign, level: "warning", stage: "target_filter", message: `Pominięto ${place.companyName}, bo ${targetSkip.reason}. Nic nie zapisano w panelu.` });
            continue;
          }

          const emailResult = await findBusinessEmail({
            companyName: place.companyName,
            website: place.website,
            city: place.city,
            googleSearchApiKey: secrets.googleSearch,
            googleSearchCx: secrets.googleSearchCx,
          });

          if (!emailResult.email) {
            stats.missingEmail += 1;
            await logRun({ runId, campaign, level: "warning", stage: "no_email", message: `Pominięto ${place.companyName}, bo bot nie znalazł adresu email. Nic nie zapisano w panelu.` });
            continue;
          }
          stats.emailsFound += 1;

          const isSuppressed = await suppressionMatch({ clientId: campaign.client_id, email: emailResult.email, website: place.website, companyName: place.companyName });
          if (isSuppressed) {
            stats.skippedDuplicates += 1;
            await logRun({ runId, campaign, level: "warning", stage: "blacklist", message: `Pominięto ${place.companyName}, bo jest na globalnej/celowanej blackliście.` });
            continue;
          }

          const duplicate = await duplicateExists({ clientId: campaign.client_id, campaignId: campaign.id, companyName: place.companyName, googleMapsUrl: place.googleMapsUrl, website: place.website, email: emailResult.email });
          if (duplicate) {
            stats.skippedDuplicates += 1;
            await logRun({ runId, campaign, level: "info", stage: "duplicate", message: `Pominięto ${place.companyName}, bo taki lead lub domena już istnieje w panelu albo kolejce.` });
            continue;
          }

          const audit = await auditWebsite(place.website);
          const auditSkip = shouldSkipAfterCheapAudit(campaign, place, audit);
          if (auditSkip.skip) {
            stats.skippedDuplicates += 1;
            await logRun({
              runId,
              campaign,
              level: "warning",
              stage: "pre_ai_filter",
              message: `Pominięto ${place.companyName}, bo ${auditSkip.reason}. OpenAI nie zostało uruchomione dla tego leada.`,
              metadata: { checkedUrl: audit.checkedUrl, signals: audit.signals, problems: audit.problems },
            });
            continue;
          }

          const generated = await generateLeadWithAi({ apiKey: openaiApiKey, model: botApi.model, client: campaign.client_accounts, campaign, place, email: emailResult.email, audit });
          const minQualifiedScore = minimumQualifiedLeadScore(campaign);
          if (generated.score < minQualifiedScore) {
            stats.skippedDuplicates += 1;
            await logRun({
              runId,
              campaign,
              level: "warning",
              stage: "low_score",
              message: `Pominięto ${place.companyName}, bo AI oceniło dopasowanie na ${generated.score}/10 przy minimum ${minQualifiedScore}/10. Lead nie trafi do panelu.`,
              metadata: { score: generated.score, mainProblem: generated.mainProblem, aiSummary: generated.aiSummary },
            });
            continue;
          }
          const leadPayload = leadPayloadFromPlace(place, industry, location, emailResult.email, generated, emailResult.source);
          const scheduledAt = schedule.dates[slotIndex] || new Date(Date.now() + (slotIndex + 1) * 60_000).toISOString();

          const trackingId = crypto.randomUUID();
          if (campaign.requires_approval_before_send) {
            await createApprovalDraft({ campaign, place, leadPayload, email: emailResult.email, subject: generated.subject, body: generated.body, trackingId });
            slotIndex += 1;
            stats.queuedEmails += 1;
            await logRun({ runId, campaign, stage: "approval_draft", message: `Przygotowano mail do ${place.companyName}. Czeka na akceptację klienta w panelu klienta.` });
          } else {
            const { error: queueError } = await db.from("send_queue").insert({
              client_id: campaign.client_id,
              campaign_id: campaign.id,
              scheduled_at: scheduledAt,
              status: "pending",
              email_to: emailResult.email,
              subject: generated.subject,
              body: generated.body,
              tracking_id: trackingId,
              lead_payload: leadPayload,
              generated_payload: generated,
            });
            if (queueError) throw queueError;
            slotIndex += 1;
            stats.queuedEmails += 1;
            await logRun({ runId, campaign, stage: "queued", message: `Zaplanowano mail do ${place.companyName} na ${scheduledAt}. Lead pojawi się w panelu dopiero po wysłaniu.` });
          }
        } catch (error) {
          const message = `${place.companyName}: ${errorMessage(error, "błąd planowania leada")}`;
          stats.queueFailures += 1;
          stats.errors.push(message);
          await logRun({ runId, campaign, level: "error", stage: "queue", message, metadata: { place } });
        }
      }
    }

    const nextLocationIndex = rawLocations.length ? (rotatedLocations.start + Math.max(stats.searchedQueries, 1)) % rawLocations.length : 0;
    const nextKeywordIndex = rawSearchTerms.length ? (rotatedTerms.start + Math.max(1, Math.ceil(stats.searchedQueries / Math.max(rawLocations.length, 1)))) % rawSearchTerms.length : 0;
    const underTarget = stats.queuedEmails < availableToday;
    const nextRunAt = (await dynamicScheduleForCampaign(campaign, { strictlyAfter: true })).nextRunAt;
    await db.from("campaigns").update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunAt,
      search_cursor: nextLocationIndex,
      last_location_index: nextLocationIndex,
      last_keyword_index: nextKeywordIndex,
    }).eq("id", campaign.id);
    const finishStatus = stats.errors.length ? "partial" : "completed";
    if (underTarget) {
      await logRun({
        runId,
        campaign,
        level: "warning",
        stage: "under_target_retry",
        message: `Bot nie znalazł kontaktu dla tej pojedynczej próby. Kampania NIE kończy pracy na dziś. Następna próba wyszukania 1 leada: ${nextRunAt}.`,
        metadata: {
          targetForToday: availableToday,
          queuedEmails: stats.queuedEmails,
          searchedQueries: stats.searchedQueries,
          foundPlaces: stats.foundPlaces,
          missingEmail: stats.missingEmail,
          emailsFound: stats.emailsFound,
          skippedDuplicates: stats.skippedDuplicates,
          minScore: minimumQualifiedLeadScore(campaign),
          nextRunAt,
        },
      });
    }
    await finishRun(runId, stats, finishStatus);
    await logRun({ runId, campaign, stage: "finish", message: campaign.requires_approval_before_send ? `Gotowe. W tym cyklu dodano ${stats.queuedEmails} mail do akceptacji klienta. Następne szukanie pojedynczego leada: ${nextRunAt}.` : `Gotowe. W tym cyklu dodano ${stats.queuedEmails} mail do kolejki. Następne szukanie pojedynczego leada: ${nextRunAt}.` });
    return { campaign, stats, runId };
  } catch (error) {
    const message = errorMessage(error, "Błąd planowania kampanii");
    stats.errors.push(message);
    if (campaign) await logRun({ runId, campaign, level: "error", stage: "fatal", message });
    await finishRun(runId, stats, "failed");
    throw error;
  } finally {
    await releaseCampaignLock(campaignId, lockId);
  }
}

async function globalSchedulerGuard(activeSchedulerItems: number) {
  const maxActiveCampaigns = Number(process.env.APP_MAX_ACTIVE_CAMPAIGNS || 0);
  if (Number.isFinite(maxActiveCampaigns) && maxActiveCampaigns > 0 && activeSchedulerItems > maxActiveCampaigns) {
    return { allowed: false, reason: `Globalny limit aktywnych kampanii APP_MAX_ACTIVE_CAMPAIGNS=${maxActiveCampaigns} został przekroczony. Aktywnych kampanii: ${activeSchedulerItems}.` };
  }

  const maxDailyEmails = Number(process.env.APP_MAX_DAILY_EMAILS || 0);
  if (Number.isFinite(maxDailyEmails) && maxDailyEmails > 0) {
    const { count, error } = await adminDb()
      .from("messages")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", startOfUtcDay().toISOString())
      .lt("sent_at", startOfNextUtcDay().toISOString())
      .in("status", ["sent", "delivered", "opened", "replied", "follow_up_sent"]);
    if (error) throw error;
    if ((count || 0) >= maxDailyEmails) {
      return { allowed: false, reason: `Globalny limit dzienny APP_MAX_DAILY_EMAILS=${maxDailyEmails} został osiągnięty. Wysłano dziś: ${count || 0}.` };
    }
  }

  return { allowed: true, reason: null as string | null };
}

export async function planDueCampaigns(limit?: number) {
  const lockName = "cron:run-campaigns:dynamic-scheduler";
  const lockId = await acquireSystemLock(lockName, 5);
  if (!lockId) {
    return {
      processed: 0,
      skipped: true,
      reason: "Poprzednie wywołanie run-campaigns nadal działa. Cron nie uruchamia drugiego procesu równolegle.",
      normalizedSchedule: null,
      results: [],
    };
  }

  try {
    const normalizedSchedule = await normalizeDynamicCampaignSchedule();
    const globalGuard = await globalSchedulerGuard(normalizedSchedule.activeSchedulerItems || 0);
    if (!globalGuard.allowed) {
      return { processed: 0, skipped: true, reason: globalGuard.reason, normalizedSchedule, results: [] };
    }
    const now = new Date().toISOString();
    let query = adminDb()
      .from("campaigns")
      .select("id,name,next_run_at,bot_id,client_id")
      .eq("status", "active")
      .eq("auto_run_enabled", true)
      .lte("next_run_at", now)
      .order("next_run_at", { ascending: true, nullsFirst: true })
      .limit(1);

    if (typeof limit === "number") query = query.limit(clamp(limit, 1, 1));

    const { data: campaigns, error } = await query;
    if (error) throw error;

    const rows = campaigns || [];
    const results: Array<{ campaignId: string; botId: string | null; clientId: string | null; ok: boolean; stats?: DailyPlanStats; error?: string }> = [];

    // Produkcyjnie przetwarzamy maksymalnie jedną kampanię na jeden tick crona.
    // Reszta czeka do kolejnego minutowego wywołania Vercel. Dzięki temu nie ma timeoutów,
    // wyścigów workerów ani równoległego przepalania Google/OpenAI.
    for (const campaign of rows) {
      try {
        const result = await planCampaignDay(campaign.id, {});
        results.push({ campaignId: campaign.id, botId: campaign.bot_id || null, clientId: campaign.client_id || null, ok: true, stats: result.stats });
      } catch (error) {
        results.push({ campaignId: campaign.id, botId: campaign.bot_id || null, clientId: campaign.client_id || null, ok: false, error: errorMessage(error, "Błąd planowania") });
      }
    }
    return { processed: results.length, normalizedSchedule, maxCampaignsPerCronTick: 1, results };
  } finally {
    await releaseSystemLock(lockName, lockId);
  }
}
