import "server-only";

import { isWeekendInTimeZone, nextBusinessDayAtHour } from "@/lib/bot/businessDays";
import { adminDb } from "@/lib/supabaseAdmin";
import type { Campaign, ClientAccount } from "@/lib/types";

export const SENT_COUNT_STATUSES = [
  "sent",
  "delivered",
  "opened",
  "replied",
  "follow_up_sent",
  "bounced",
  "spam",
  "unsubscribed",
] as const;

export class SendLimitError extends Error {
  code: "DAILY_LIMIT_REACHED" | "MONTHLY_LIMIT_REACHED" | "WEEKEND_BLOCKED" | "OUTSIDE_WORK_HOURS";
  retryAt: string;

  constructor(code: SendLimitError["code"], message: string, retryAt: string) {
    super(message);
    this.name = "SendLimitError";
    this.code = code;
    this.retryAt = retryAt;
  }
}

type ClientForSafety = ClientAccount & {
  warmup_enabled?: boolean | null;
  warmup_started_at?: string | null;
  warmup_stage_days?: number | null;
};

type CampaignForDelay = Pick<Campaign, "send_delay_min_seconds" | "send_delay_max_seconds"> | null | undefined;

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function zonedDateAt(date: Date, timeZone: string, dayOffset: number, hour = 0) {
  const parts = getZonedParts(date, timeZone);
  const guess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset, hour, 0, 0, 0));
  return new Date(guess.getTime() - timeZoneOffsetMs(guess, timeZone));
}

function zonedMonthAt(date: Date, timeZone: string, monthOffset: number) {
  const parts = getZonedParts(date, timeZone);
  const guess = new Date(Date.UTC(parts.year, parts.month - 1 + monthOffset, 1, 0, 0, 0, 0));
  return new Date(guess.getTime() - timeZoneOffsetMs(guess, timeZone));
}

function normalizeWarmupDailyLimits(value: unknown, targetLimit: number): number[] {
  const raw = Array.isArray(value) ? value : [];
  const limits = raw
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .map((item) => clamp(Math.round(item), 1, 500));

  if (!limits.length) return [clamp(Math.round(targetLimit), 1, 500)];

  const cleaned: number[] = [];
  for (const limit of limits) {
    const previous = cleaned[cleaned.length - 1];
    cleaned.push(previous === undefined ? limit : Math.max(previous, limit));
  }
  return cleaned;
}

function campaignWarmupStage(campaign: Pick<Campaign, "created_at" | "sending_timezone"> | null | undefined, at: Date) {
  if (!campaign?.created_at) return 0;
  const startedAt = new Date(campaign.created_at);
  if (Number.isNaN(startedAt.getTime())) return 0;
  const timeZone = requiredCampaignTimeZone(campaign);
  const started = getZonedParts(startedAt, timeZone);
  const current = getZonedParts(at, timeZone);
  const startDay = Date.UTC(started.year, started.month - 1, started.day);
  const currentDay = Date.UTC(current.year, current.month - 1, current.day);
  return Math.max(0, Math.floor((currentDay - startDay) / (24 * 60 * 60 * 1000)));
}


export function requiredCampaignTimeZone(campaign: Pick<Campaign, "sending_timezone"> | null | undefined) {
  const value = String(campaign?.sending_timezone || "").trim();
  if (!value) throw new Error("Strefa czasowa wysyłki nie jest ustawiona w panelu kampanii.");
  return value;
}

function campaignTimeZone(campaign: Pick<Campaign, "sending_timezone"> | null | undefined) {
  if (!campaign) throw new Error("Brakuje kampanii. Nie można obliczyć strefy czasowej wysyłki bez konfiguracji kampanii.");
  return requiredCampaignTimeZone(campaign);
}

export function requiredCampaignNumber(value: unknown, label: string) {
  if (value === null || value === undefined || String(value).trim() === "") throw new Error(`${label} nie jest ustawione w panelu kampanii.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} ma niepoprawną wartość w panelu kampanii.`);
  return parsed;
}

export function effectiveDailySendLimit(client: ClientForSafety, campaign?: Pick<Campaign, "daily_limit" | "safety_daily_cap" | "warmup_daily_limits" | "created_at" | "sending_timezone"> | null, at: Date = new Date()) {
  const clientLimit = toNumber(client.daily_email_limit, 50);
  const campaignTarget = campaign ? requiredCampaignNumber(campaign.daily_limit, "Docelowa liczba maili dziennie") : clientLimit;
  const baseLimit = clamp(campaignTarget, 1, 20000);

  if (!campaign || client.warmup_enabled === false) return baseLimit;

  const limits = normalizeWarmupDailyLimits(campaign.warmup_daily_limits, baseLimit);
  const stage = campaignWarmupStage(campaign, at);
  const rawLimit = limits[Math.min(stage, limits.length - 1)] || baseLimit;
  return clamp(Math.min(rawLimit, baseLimit), 1, baseLimit);
}

async function countSent(clientId: string, fromIso: string, toIso?: string) {
  let query = adminDb()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("sent_at", fromIso)
    .in("status", SENT_COUNT_STATUSES as unknown as string[]);
  if (toIso) query = query.lt("sent_at", toIso);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

function daysInZonedMonth(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
}

function autoMonthlyLimitForCampaign(client: ClientForSafety, campaign: Pick<Campaign, "daily_limit" | "safety_daily_cap" | "warmup_daily_limits" | "created_at" | "sending_timezone" | "send_on_weekends"> | null | undefined, now = new Date()) {
  const timeZone = campaignTimeZone(campaign);
  const parts = getZonedParts(now, timeZone);
  const daysInMonth = daysInZonedMonth(now, timeZone);
  let total = 0;
  let countedDays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const guess = new Date(Date.UTC(parts.year, parts.month - 1, day, 12, 0, 0, 0));
    const candidate = new Date(guess.getTime() - timeZoneOffsetMs(guess, timeZone));
    if (!campaign?.send_on_weekends && isWeekendInTimeZone(candidate, timeZone)) continue;
    total += effectiveDailySendLimit(client, campaign, candidate);
    countedDays += 1;
  }

  // Zabezpieczenie na egzotyczne przypadki stref czasowych: miesiąc zawsze powinien mieć minimum jeden dzień roboczy.
  return clamp(total || effectiveDailySendLimit(client, campaign, now) * Math.max(countedDays, 1), 1, 20000);
}

export function describeMonthlyLimit(client: ClientForSafety, campaign?: Pick<Campaign, "daily_limit" | "safety_daily_cap" | "warmup_daily_limits" | "created_at" | "sending_timezone" | "send_on_weekends" | "monthly_limit"> | null, now = new Date()) {
  const manual = Math.round(toNumber(campaign?.monthly_limit, 0));
  if (manual > 0) return { mode: "manual" as const, limit: clamp(manual, 1, 20000) };
  const timeZone = campaignTimeZone(campaign);
  const daysInMonth = daysInZonedMonth(now, timeZone);
  let eligibleDays = 0;
  const parts = getZonedParts(now, timeZone);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const guess = new Date(Date.UTC(parts.year, parts.month - 1, day, 12, 0, 0, 0));
    const candidate = new Date(guess.getTime() - timeZoneOffsetMs(guess, timeZone));
    if (!campaign?.send_on_weekends && isWeekendInTimeZone(candidate, timeZone)) continue;
    eligibleDays += 1;
  }
  return {
    mode: "auto" as const,
    limit: autoMonthlyLimitForCampaign(client, campaign, now),
    daysInMonth,
    eligibleDays,
    weekendsExcluded: campaign?.send_on_weekends !== true,
  };
}

export async function getSendCapacity(client: ClientForSafety, campaign?: Pick<Campaign, "daily_limit" | "safety_daily_cap" | "warmup_daily_limits" | "created_at" | "sending_timezone" | "send_on_weekends" | "monthly_limit"> | null) {
  const now = new Date();
  const dailyLimit = effectiveDailySendLimit(client, campaign, now);
  // Limit miesięczny może być ręczny w kampanii albo automatyczny.
  // Automatyczny liczy realną długość miesiąca i odejmuje weekendy, jeżeli kampania ma weekendy wyłączone.
  const monthlyDescription = describeMonthlyLimit(client, campaign, now);
  const monthlyLimit = monthlyDescription.limit;
  const timeZone = campaignTimeZone(campaign);
  const dayStart = zonedDateAt(now, timeZone, 0);
  const dayEnd = zonedDateAt(now, timeZone, 1);
  const monthStart = zonedMonthAt(now, timeZone, 0);
  const monthEnd = zonedMonthAt(now, timeZone, 1);
  const [sentToday, sentThisMonth] = await Promise.all([
    countSent(client.id, dayStart.toISOString(), dayEnd.toISOString()),
    countSent(client.id, monthStart.toISOString(), monthEnd.toISOString()),
  ]);

  return {
    dailyLimit,
    monthlyLimit,
    monthlyLimitMode: monthlyDescription.mode,
    monthDays: monthlyDescription.mode === "auto" ? monthlyDescription.daysInMonth : undefined,
    monthEligibleDays: monthlyDescription.mode === "auto" ? monthlyDescription.eligibleDays : undefined,
    sentToday,
    sentThisMonth,
    dailyRemaining: Math.max(dailyLimit - sentToday, 0),
    monthlyRemaining: Math.max(monthlyLimit - sentThisMonth, 0),
    dayRetryAt: dayEnd.toISOString(),
    monthRetryAt: monthEnd.toISOString(),
  };
}

export async function assertCanSendNow(client: ClientForSafety, campaign?: Pick<Campaign, "daily_limit" | "safety_daily_cap" | "warmup_daily_limits" | "created_at" | "sending_timezone" | "send_on_weekends" | "workday_start_hour" | "workday_end_hour" | "monthly_limit"> | null) {
  const timeZone = campaignTimeZone(campaign);
  const now = new Date();
  if (!campaign) throw new Error("Brakuje kampanii. Nie można sprawdzić okna wysyłki bez konfiguracji kampanii.");
  const startHour = Math.min(Math.max(Math.round(requiredCampaignNumber(campaign.workday_start_hour, "Godzina startu pracy bota")), 0), 23);
  const endHour = Math.min(Math.max(Math.round(requiredCampaignNumber(campaign.workday_end_hour, "Godzina końca pracy bota")), startHour + 1), 24);
  const parts = getZonedParts(now, timeZone);
  if (!campaign?.send_on_weekends && isWeekendInTimeZone(now, timeZone)) {
    const retryAt = nextBusinessDayAtHour(now, startHour, timeZone).toISOString();
    throw new SendLimitError(
      "WEEKEND_BLOCKED",
      "Weekend: bot nie wysyła maili w soboty ani niedziele. Wysyłka wróci w najbliższy dzień roboczy rano.",
      retryAt,
    );
  }
  if (parts.hour < startHour || parts.hour >= endHour) {
    const base = parts.hour >= endHour ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now;
    let retry = zonedDateAt(base, timeZone, 0, startHour);
    if (!campaign?.send_on_weekends && isWeekendInTimeZone(retry, timeZone)) retry = nextBusinessDayAtHour(retry, startHour, timeZone);
    throw new SendLimitError(
      "OUTSIDE_WORK_HOURS",
      `Po godzinach pracy bota: okno wysyłki ${startHour}:00-${endHour}:00 (${timeZone}).`,
      retry.toISOString(),
    );
  }
  const capacity = await getSendCapacity(client, campaign);
  if (capacity.monthlyRemaining <= 0) {
    throw new SendLimitError(
      "MONTHLY_LIMIT_REACHED",
      `Osiągnięto miesięczny limit klienta: ${capacity.sentThisMonth}/${capacity.monthlyLimit}. Bot nie wyśle kolejnej wiadomości w tym miesiącu.`,
      capacity.monthRetryAt,
    );
  }
  if (capacity.dailyRemaining <= 0) {
    throw new SendLimitError(
      "DAILY_LIMIT_REACHED",
      `Osiągnięto dzienny limit/warm-up klienta: ${capacity.sentToday}/${capacity.dailyLimit}. Bot poczeka do kolejnego dnia.`,
      capacity.dayRetryAt,
    );
  }
  return capacity;
}

export function isSendLimitError(error: unknown): error is SendLimitError {
  return error instanceof SendLimitError || (typeof error === "object" && error !== null && "code" in error && "retryAt" in error);
}

function sendDelayBounds(_campaign: CampaignForDelay) {
  // Stare ręczne opóźnienia 30-90 s są wyłączone. Wysyłkę rozkłada send_queue według daily_limit i okna pracy.
  return null;
}

export function nextSendDelayMs(_campaign?: CampaignForDelay) {
  return 0;
}

export async function waitBetweenSends(_campaign?: CampaignForDelay) {
  return 0;
}
