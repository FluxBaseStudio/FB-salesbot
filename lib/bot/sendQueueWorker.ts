import "server-only";

import crypto from "crypto";

import { createAdminNotification } from "@/lib/adminNotifications";
import { assertGlobalSendWorkerLimits, GlobalSendLimitError } from "@/lib/bot/globalLimits";
import { isPermanentInvalidRecipientError, isValidRecipientEmail, normalizeEmailCandidate } from "@/lib/bot/emailValidation";
import { sendMessageById } from "@/lib/bot/messageWorkflow";
import { assertCampaignReputationBeforeSend } from "@/lib/bot/reputation";
import { isWeekendInTimeZone, nextBusinessDayAtHour } from "@/lib/bot/businessDays";
import { addGlobalSuppressionForMessage } from "@/lib/bot/suppression";
import { isSendLimitError, requiredCampaignNumber } from "@/lib/bot/sendSafety";
import { adminDb } from "@/lib/supabaseAdmin";
import type { Campaign, ClientAccount } from "@/lib/types";

type QueueRow = {
  id: string;
  client_id: string;
  campaign_id: string;
  scheduled_at: string;
  status: string;
  email_to: string;
  subject: string;
  body: string;
  tracking_id: string;
  lead_payload: Record<string, unknown>;
  attempts: number | null;
  last_error?: string | null;
  kind?: string | null;
  parent_message_id?: string | null;
  lead_id?: string | null;
  sequence_step?: number | null;
  follow_up_count?: number | null;
};

type CampaignWithClient = Campaign & { client_accounts: ClientAccount | null };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function workerBatchSize(limit?: number) {
  // Produkcyjnie mała porcja: Vercel Cron odpala workera często, a rytm wysyłki ustala scheduled_at.
  // Bez env worker bierze 1 wiadomość na tick, żeby nie wystrzelić batcha maili naraz.
  const raw = Number(limit || process.env.SEND_WORKER_BATCH_SIZE || 1);
  return Math.min(Math.max(Number.isFinite(raw) ? raw : 1, 1), 3);
}

function maxAttempts() {
  const raw = Number(process.env.SEND_QUEUE_MAX_ATTEMPTS || 3);
  return Math.min(Math.max(Number.isFinite(raw) ? raw : 3, 1), 10);
}

function staleProcessingMinutes() {
  const raw = Number(process.env.SEND_QUEUE_STALE_LOCK_MINUTES || 15);
  return Math.min(Math.max(Number.isFinite(raw) ? raw : 15, 5), 120);
}

function textField(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}


async function pauseCampaignAfterFailures(row: QueueRow, errorMessageText: string) {
  const db = adminDb();
  const { data: campaign } = await db.from("campaigns").select("id,name,stop_on_send_failures,status").eq("id", row.campaign_id).maybeSingle();
  const threshold = Math.max(Number(campaign?.stop_on_send_failures || 5), 1);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("send_queue")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", row.campaign_id)
    .eq("status", "failed")
    .gte("processed_at", since);

  if ((count || 0) >= threshold && campaign?.status === "active") {
    const pausedAt = new Date().toISOString();
    await db.from("campaigns").update({
      status: "paused",
      paused_at: pausedAt,
      paused_reason: `Kampania zatrzymana po ${count} błędach wysyłki w 24h. Ostatni błąd: ${errorMessageText}`.slice(0, 900),
    }).eq("id", row.campaign_id);
    await createAdminNotification({
      tone: "danger",
      title: "Kampania zatrzymana po błędach wysyłki",
      message: `${campaign.name || "Kampania"} została wstrzymana po ${count} błędach kolejki. Sprawdź SMTP, DNS i logi przed ponownym uruchomieniem.`,
      resource: "campaigns",
      resourceId: row.campaign_id,
    });
  }
}

async function logQueue(row: QueueRow, level: "info" | "warning" | "error", stage: string, message: string, metadata?: Record<string, unknown>) {
  const { error } = await adminDb().from("run_logs").insert({
    client_id: row.client_id,
    campaign_id: row.campaign_id,
    level,
    stage,
    message,
    metadata: { queue_id: row.id, ...(metadata || {}) },
  });
  if (error) console.error("send queue log failed", error.message);
}

async function cancelQueueRow(row: QueueRow, message: string, stage = "send_queue_cancelled") {
  await adminDb()
    .from("send_queue")
    .update({
      status: "cancelled",
      processed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: message,
    })
    .eq("id", row.id);
  await logQueue(row, "warning", stage, `${message} Rekord anulowany, żeby nie blokował automatu jako failed queue.`);
}

async function loadCampaign(campaignId: string) {
  const { data, error } = await adminDb().from("campaigns").select("*, client_accounts(*)").eq("id", campaignId).single<CampaignWithClient>();
  if (error) throw error;
  if (!data?.client_accounts) throw new Error("Kolejka nie ma aktywnego klienta/SMTP.");
  return data;
}

async function stoppedBotReason(campaign: CampaignWithClient) {
  if (!campaign.bot_id) return "Kampania nie ma przypisanego bota. Kolejka zostaje wstrzymana do czasu przypisania bota.";
  const { data: bot, error } = await adminDb()
    .from("bots")
    .select("id,name,status")
    .eq("id", campaign.bot_id)
    .maybeSingle();
  if (error) throw error;
  if (!bot) return "Przypisany bot nie istnieje. Kolejka zostaje wstrzymana do czasu przypisania innego bota.";
  if (bot.status === "paused") return `Bot ${bot.name} jest zatrzymany ręcznie. Kolejka nie wyśle maila, dopóki bot nie zostanie wznowiony.`;
  if (bot.status === "maintenance") return `Bot ${bot.name} jest w trybie serwisowym. Kolejka nie wyśle maila, dopóki bot nie wróci do aktywnego statusu.`;
  if (bot.status !== "active") return `Bot ${bot.name} nie jest aktywny. Kolejka zostaje wstrzymana.`;
  return null;
}

async function postponeStoppedBotRow(row: QueueRow, reason: string) {
  const retryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await adminDb()
    .from("send_queue")
    .update({
      status: "pending",
      scheduled_at: retryAt,
      locked_at: null,
      locked_by: null,
      last_error: reason,
    })
    .eq("id", row.id);
  await logQueue(row, "warning", "bot_stopped", `${reason} Ponowna kontrola kolejki: ${retryAt}.`, { retryAt });
  return retryAt;
}

async function releaseStaleProcessingRows() {
  const db = adminDb();
  const staleBefore = new Date(Date.now() - staleProcessingMinutes() * 60_000).toISOString();
  const { data, error } = await db
    .from("send_queue")
    .select("*")
    .eq("status", "processing")
    .lt("locked_at", staleBefore)
    .order("locked_at", { ascending: true })
    .limit(50);
  if (error) throw error;

  for (const row of (data || []) as QueueRow[]) {
    const attempts = Number(row.attempts || 0);
    if (attempts >= maxAttempts()) {
      await db
        .from("send_queue")
        .update({
          status: "failed",
          locked_at: null,
          locked_by: null,
          processed_at: new Date().toISOString(),
          last_error: row.last_error || "Rekord kolejki utknął w processing i przekroczył limit prób.",
        })
        .eq("id", row.id)
        .eq("status", "processing");
      await logQueue(row, "error", "send_queue_stale_failed", "Stary rekord processing oznaczony jako failed po przekroczeniu limitu prób.", { attempts });
    } else {
      await db
        .from("send_queue")
        .update({
          status: "pending",
          locked_at: null,
          locked_by: null,
          last_error: row.last_error || "Rekord processing został odblokowany po przekroczeniu czasu blokady.",
        })
        .eq("id", row.id)
        .eq("status", "processing");
      await logQueue(row, "warning", "send_queue_stale_requeued", "Stary rekord processing wrócił do kolejki pending.", { attempts });
    }
  }
}


async function campaignScheduleForRow(row: QueueRow) {
  const { data, error } = await adminDb()
    .from("campaigns")
    .select("sending_timezone,workday_start_hour,send_on_weekends")
    .eq("id", row.campaign_id)
    .maybeSingle();
  if (error) throw error;
  const timeZone = String(data?.sending_timezone || "").trim();
  if (!timeZone) throw new Error("Strefa czasowa wysyłki nie jest ustawiona w panelu kampanii.");
  return {
    timeZone,
    startHour: Math.min(Math.max(Math.round(requiredCampaignNumber(data?.workday_start_hour, "Godzina startu pracy bota")), 0), 23),
    sendOnWeekends: data?.send_on_weekends === true,
  };
}

async function postponeWeekendRow(row: QueueRow) {
  const { timeZone, startHour, sendOnWeekends } = await campaignScheduleForRow(row);
  if (sendOnWeekends || !isWeekendInTimeZone(new Date(), timeZone)) return false;
  const retryAt = nextBusinessDayAtHour(new Date(), startHour, timeZone).toISOString();
  await adminDb()
    .from("send_queue")
    .update({
      scheduled_at: retryAt,
      locked_at: null,
      locked_by: null,
      last_error: "Weekend: wysyłka przesunięta na najbliższy dzień roboczy.",
    })
    .eq("id", row.id)
    .eq("status", "pending");
  await logQueue(row, "info", "weekend_postpone", `Weekend: bot nie wysyła maili dla tej kampanii. Kolejka przesunięta na ${retryAt}.`, { retryAt, timeZone });
  return true;
}

async function claimDueRows(limit: number) {
  const db = adminDb();
  const now = new Date().toISOString();
  const lockId = crypto.randomUUID();
  const { data, error } = await db
    .from("send_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const claimed: QueueRow[] = [];
  for (const row of (data || []) as QueueRow[]) {
    if (await postponeWeekendRow(row as QueueRow)) continue;
    const { data: updated, error: updateError } = await db
      .from("send_queue")
      .update({ status: "processing", locked_at: now, locked_by: lockId, attempts: Number(row.attempts || 0) + 1 })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) claimed.push(updated as QueueRow);
  }
  return claimed;
}

async function createVisibleLeadAndMessage(row: QueueRow) {
  const db = adminDb();
  const lead = row.lead_payload || {};
  const isFollowUp = Boolean(row.parent_message_id && row.lead_id);

  if (!isFollowUp && row.lead_id) {
    const { data: existingMessage, error: existingMessageError } = await db
      .from("messages")
      .select("id,parent_message_id,follow_up_count")
      .eq("lead_id", row.lead_id)
      .eq("client_id", row.client_id)
      .eq("campaign_id", row.campaign_id)
      .in("status", ["draft", "queued"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingMessageError) throw existingMessageError;
    if (existingMessage?.id) {
      await db.from("messages").update({ status: "queued", last_error: null }).eq("id", existingMessage.id);
      await db.from("leads").update({ status: "approved" }).eq("id", row.lead_id);
      return { leadId: row.lead_id as string, messageId: existingMessage.id as string, isFollowUp: false, parentMessageId: null, followUpCount: 0 };
    }
  }

  if (isFollowUp) {
    const followUpCount = Math.max(Number(row.follow_up_count || 1), 1);
    const { data: insertedMessage, error: messageError } = await db
      .from("messages")
      .insert({
        client_id: row.client_id,
        campaign_id: row.campaign_id,
        lead_id: row.lead_id,
        parent_message_id: row.parent_message_id,
        subject: row.subject,
        body: row.body,
        status: "queued",
        tracking_id: row.tracking_id || crypto.randomUUID(),
        email_to: row.email_to,
        follow_up_count: followUpCount,
        sequence_step: Math.max(Number(row.sequence_step || 1), 1),
      })
      .select("id")
      .single();
    if (messageError) throw messageError;
    return { leadId: row.lead_id as string, messageId: insertedMessage.id as string, isFollowUp, parentMessageId: row.parent_message_id as string, followUpCount };
  }

  const { data: insertedLead, error: leadError } = await db
    .from("leads")
    .insert({
      client_id: row.client_id,
      campaign_id: row.campaign_id,
      company_name: textField(lead, "company_name") || "Lead",
      industry: textField(lead, "industry"),
      city: textField(lead, "city"),
      phone: textField(lead, "phone"),
      website: textField(lead, "website"),
      email: row.email_to,
      google_maps_url: textField(lead, "google_maps_url"),
      source: textField(lead, "source") || "google_places",
      score: Number(lead.score ?? 0),
      main_problem: textField(lead, "main_problem"),
      ai_summary: textField(lead, "ai_summary"),
      generated_subject: row.subject,
      generated_email: row.body,
      status: "sent",
    })
    .select("id")
    .single();
  if (leadError) throw leadError;

  const { data: insertedMessage, error: messageError } = await db
    .from("messages")
    .insert({
      client_id: row.client_id,
      campaign_id: row.campaign_id,
      lead_id: insertedLead.id,
      subject: row.subject,
      body: row.body,
      status: "queued",
      tracking_id: row.tracking_id || crypto.randomUUID(),
      email_to: row.email_to,
      follow_up_count: 0,
      sequence_step: 0,
    })
    .select("id")
    .single();
  if (messageError) {
    await db.from("leads").delete().eq("id", insertedLead.id);
    throw messageError;
  }

  return { leadId: insertedLead.id as string, messageId: insertedMessage.id as string, isFollowUp: false, parentMessageId: null, followUpCount: 0 };
}

export async function processSendQueue(limit?: number) {
  const db = adminDb();
  await releaseStaleProcessingRows();
  try {
    await assertGlobalSendWorkerLimits();
  } catch (error) {
    if (error instanceof GlobalSendLimitError) {
      return { processed: 0, paused: true, reason: error.message, code: error.code, retryAt: error.retryAt, results: [] };
    }
    throw error;
  }
  const rows = await claimDueRows(workerBatchSize(limit));
  const results: Array<{ queueId: string; ok: boolean; messageId?: string; leadId?: string; error?: string; retryAt?: string }> = [];

  for (const row of rows) {
    let leadId: string | null = null;
    let messageId: string | null = null;
    try {
      const campaign = await loadCampaign(row.campaign_id);
      if (campaign.status !== "active") throw new Error("Kampania nie jest aktywna. Rekord kolejki anulowany.");
      if (campaign.client_accounts?.subscription_status !== "active") throw new Error("Klient nie ma aktywnej subskrypcji. Rekord kolejki anulowany.");
      const botStopReason = await stoppedBotReason(campaign);
      if (botStopReason) {
        const retryAt = await postponeStoppedBotRow(row, botStopReason);
        results.push({ queueId: row.id, ok: false, error: botStopReason, retryAt });
        continue;
      }
      await assertCampaignReputationBeforeSend(row.campaign_id);

      const normalizedRecipient = normalizeEmailCandidate(row.email_to);
      if (!isValidRecipientEmail(normalizedRecipient)) {
        await cancelQueueRow(row, `Nieprawidłowy adres odbiorcy przed SMTP: ${row.email_to || "brak"}.`, "invalid_recipient_precheck");
        results.push({ queueId: row.id, ok: false, error: "Nieprawidłowy adres odbiorcy. Rekord anulowany." });
        continue;
      }
      row.email_to = normalizedRecipient;

      const created = await createVisibleLeadAndMessage(row);
      leadId = created.leadId;
      messageId = created.messageId;
      await sendMessageById(messageId, { force: true });
      if (created.isFollowUp && created.parentMessageId) {
        await db
          .from("messages")
          .update({ follow_up_count: created.followUpCount, follow_up_sent_at: new Date().toISOString(), follow_up_due_at: null, last_error: null })
          .eq("id", created.parentMessageId);
      }
      await db.from("send_queue").update({ status: "sent", processed_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      await logQueue(row, "info", "send_queue", `Wysłano zaplanowaną wiadomość do ${row.email_to}. Lead i wiadomość pojawiły się w panelu.`, { messageId, leadId, kind: row.kind || "initial" });
      results.push({ queueId: row.id, ok: true, messageId, leadId });
    } catch (error) {
      const message = errorMessage(error, "Błąd wysyłki z kolejki.");
      const retryAt = isSendLimitError(error) ? error.retryAt : null;
      if (messageId) await db.from("messages").delete().eq("id", messageId);
      if (leadId) await db.from("leads").delete().eq("id", leadId);

      if (isPermanentInvalidRecipientError(message)) {
        await cancelQueueRow(row, `${message} To wygląda na stały błąd odbiorcy/MX, więc nie ponawiam wysyłki.`, "invalid_recipient_smtp");
        results.push({ queueId: row.id, ok: false, error: message });
      } else if (retryAt) {
        await db.from("send_queue").update({ status: "pending", scheduled_at: retryAt, locked_at: null, locked_by: null, last_error: message }).eq("id", row.id);
        await logQueue(row, "warning", "send_queue_limit", `${message} Kolejka spróbuje ponownie: ${retryAt}.`);
        results.push({ queueId: row.id, ok: false, error: message, retryAt });
      } else if (Number(row.attempts || 0) < maxAttempts()) {
        const retryDate = new Date(Date.now() + 1000 * 60 * 30).toISOString();
        await db.from("send_queue").update({ status: "pending", scheduled_at: retryDate, locked_at: null, locked_by: null, last_error: message }).eq("id", row.id);
        await logQueue(row, "warning", "send_queue_retry", `${message} Ponowna próba za 30 minut.`);
        results.push({ queueId: row.id, ok: false, error: message, retryAt: retryDate });
      } else {
        await db.from("send_queue").update({ status: "failed", processed_at: new Date().toISOString(), locked_at: null, locked_by: null, last_error: message }).eq("id", row.id);
        if (messageId) await addGlobalSuppressionForMessage(messageId, "Globalna blokada po powtarzającym się błędzie wysyłki z kolejki.");
        await pauseCampaignAfterFailures(row, message);
        await createAdminNotification({ tone: "danger", title: "Rekord kolejki failed", message: `${row.email_to}: ${message}`, resource: "send_queue", resourceId: row.id });
        await logQueue(row, "error", "send_queue_failed", `${message} Rekord kolejki oznaczony jako failed. Panel klienta pozostaje czysty.`);
        results.push({ queueId: row.id, ok: false, error: message });
      }
    }
  }

  return { processed: results.length, results };
}
