import "server-only";

import { createAdminNotification } from "@/lib/adminNotifications";
import { adminDb } from "@/lib/supabaseAdmin";
import { SENT_COUNT_STATUSES } from "@/lib/bot/sendSafety";

export class GlobalSendLimitError extends Error {
  code: "APP_MAX_DAILY_EMAILS" | "APP_MAX_MONTHLY_EMAILS" | "APP_MAX_FAILED_QUEUE" | "APP_MAX_PENDING_QUEUE";
  retryAt: string | null;

  constructor(code: GlobalSendLimitError["code"], message: string, retryAt: string | null = null) {
    super(message);
    this.name = "GlobalSendLimitError";
    this.code = code;
    this.retryAt = retryAt;
  }
}

function optionalPositiveInt(name: string) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.floor(parsed);
}

function optionalPositiveIntWithMin(name: string, min: number) {
  const value = optionalPositiveInt(name);
  return value ? Math.max(value, min) : null;
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

async function countSent(fromIso: string, toIso: string) {
  const { count, error } = await adminDb()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", fromIso)
    .lt("sent_at", toIso)
    .in("status", SENT_COUNT_STATUSES as unknown as string[]);
  if (error) throw error;
  return count || 0;
}

async function countQueue(status: "pending" | "failed") {
  const { count, error } = await adminDb()
    .from("send_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  if (error) throw error;
  return count || 0;
}

export async function getGlobalLimitSnapshot() {
  const now = new Date();
  const dayStart = startOfUtcDay(now);
  const nextDay = startOfNextUtcDay(now);
  const monthStart = startOfUtcMonth(now);
  const nextMonth = startOfNextUtcMonth(now);
  const [sentToday, sentThisMonth, pendingQueue, failedQueue] = await Promise.all([
    countSent(dayStart.toISOString(), nextDay.toISOString()),
    countSent(monthStart.toISOString(), nextMonth.toISOString()),
    countQueue("pending"),
    countQueue("failed"),
  ]);

  return {
    generatedAt: now.toISOString(),
    sentToday,
    sentThisMonth,
    pendingQueue,
    failedQueue,
    limits: {
      maxDailyEmails: optionalPositiveInt("APP_MAX_DAILY_EMAILS"),
      maxMonthlyEmails: optionalPositiveInt("APP_MAX_MONTHLY_EMAILS"),
      maxPendingQueue: optionalPositiveInt("APP_MAX_PENDING_QUEUE"),
      maxFailedQueue: optionalPositiveIntWithMin("APP_MAX_FAILED_QUEUE", 5),
    },
    retry: {
      nextDay: nextDay.toISOString(),
      nextMonth: nextMonth.toISOString(),
    },
  };
}

export async function assertGlobalSendWorkerLimits() {
  const snapshot = await getGlobalLimitSnapshot();
  const { limits } = snapshot;

  if (limits.maxFailedQueue && snapshot.failedQueue >= limits.maxFailedQueue) {
    await createAdminNotification({
      tone: "danger",
      title: "Globalny limit failed queue osiągnięty",
      message: `Worker wstrzymał wysyłkę, bo failed queue ma ${snapshot.failedQueue}/${limits.maxFailedQueue}. Napraw błędy SMTP/API przed dalszą wysyłką.`,
      resource: "send_queue",
      dedupeKey: "global:failed-queue-limit",
    });
    throw new GlobalSendLimitError("APP_MAX_FAILED_QUEUE", `Globalny limit failed queue osiągnięty: ${snapshot.failedQueue}/${limits.maxFailedQueue}.`, null);
  }

  if (limits.maxPendingQueue && snapshot.pendingQueue > limits.maxPendingQueue) {
    await createAdminNotification({
      tone: "warning",
      title: "Globalny limit pending queue przekroczony",
      message: `Worker wstrzymał wysyłkę, bo pending queue ma ${snapshot.pendingQueue}/${limits.maxPendingQueue}. Kolejka rośnie szybciej niż worker ją obsługuje.`,
      resource: "send_queue",
      dedupeKey: "global:pending-queue-limit",
    });
    throw new GlobalSendLimitError("APP_MAX_PENDING_QUEUE", `Globalny limit pending queue przekroczony: ${snapshot.pendingQueue}/${limits.maxPendingQueue}.`, null);
  }

  if (limits.maxDailyEmails && snapshot.sentToday >= limits.maxDailyEmails) {
    await createAdminNotification({
      tone: "warning",
      title: "Globalny dzienny limit wysyłki osiągnięty",
      message: `Worker wstrzymał wysyłkę do następnego dnia UTC: ${snapshot.sentToday}/${limits.maxDailyEmails}.`,
      resource: "messages",
      dedupeKey: "global:daily-email-limit",
    });
    throw new GlobalSendLimitError("APP_MAX_DAILY_EMAILS", `Globalny dzienny limit wysyłki osiągnięty: ${snapshot.sentToday}/${limits.maxDailyEmails}.`, snapshot.retry.nextDay);
  }

  if (limits.maxMonthlyEmails && snapshot.sentThisMonth >= limits.maxMonthlyEmails) {
    await createAdminNotification({
      tone: "danger",
      title: "Globalny miesięczny limit wysyłki osiągnięty",
      message: `Worker wstrzymał wysyłkę do następnego miesiąca UTC: ${snapshot.sentThisMonth}/${limits.maxMonthlyEmails}.`,
      resource: "messages",
      dedupeKey: "global:monthly-email-limit",
    });
    throw new GlobalSendLimitError("APP_MAX_MONTHLY_EMAILS", `Globalny miesięczny limit wysyłki osiągnięty: ${snapshot.sentThisMonth}/${limits.maxMonthlyEmails}.`, snapshot.retry.nextMonth);
  }

  return snapshot;
}
