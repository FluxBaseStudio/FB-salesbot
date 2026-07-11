import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { auditSystem } from "@/lib/signupOrder";
import { adminDb } from "@/lib/supabaseAdmin";
import { validateRecordId } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const RUNNER_LOCK_NAMES = ["campaign-runner", "cron:run-campaigns:dynamic-scheduler"];

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

function zonedDayBounds(timeZone: string, date = new Date()) {
  const parts = getZonedParts(date, timeZone);
  const startGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  const nextGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0, 0));
  return {
    start: new Date(startGuess.getTime() - timeZoneOffsetMs(startGuess, timeZone)),
    end: new Date(nextGuess.getTime() - timeZoneOffsetMs(nextGuess, timeZone)),
  };
}

function nextRunnableAt(campaign: { workday_start_hour: number | null; workday_end_hour: number | null; sending_timezone: string | null }) {
  const timeZone = String(campaign.sending_timezone || "Europe/Warsaw").trim() || "Europe/Warsaw";
  const startHour = Math.min(Math.max(Math.round(Number(campaign.workday_start_hour ?? 6)), 0), 23);
  const endHour = Math.min(Math.max(Math.round(Number(campaign.workday_end_hour ?? 22)), startHour + 1), 24);
  const now = new Date();
  const start = zonedDateAtHour(now, startHour, timeZone);
  const end = zonedDateAtHour(now, endHour, timeZone);
  if (now.getTime() < start.getTime()) return start.toISOString();
  if (now.getTime() < end.getTime()) return now.toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return zonedDateAtHour(tomorrow, startHour, timeZone).toISOString();
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const id = validateRecordId(params.id);
  if (!id.ok) return jsonError(id.errors.join(" "), 400);

  try {
    const db = adminDb();
    const { data: campaign, error: campaignError } = await db
      .from("campaigns")
      .select("id,client_id,name,status,workday_start_hour,workday_end_hour,sending_timezone")
      .eq("id", id.data)
      .single();
    if (campaignError) throw campaignError;
    if (!campaign) return jsonError("Nie znaleziono kampanii.", 404);

    const timeZone = String(campaign.sending_timezone || "Europe/Warsaw").trim() || "Europe/Warsaw";
    const bounds = zonedDayBounds(timeZone);
    const nextRunAt = campaign.status === "active" ? nextRunnableAt(campaign) : null;

    const [sentToday, cancelledQueue, releasedQueue, failedRuns] = await Promise.all([
      db
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .gte("sent_at", bounds.start.toISOString())
        .lt("sent_at", bounds.end.toISOString())
        .in("status", ["sent", "delivered", "opened", "replied", "follow_up_sent"]),
      db
        .from("send_queue")
        .update({ status: "cancelled", locked_at: null, locked_by: null, processed_at: new Date().toISOString(), last_error: "Anulowane resetem kampanii. Wysłane dziś wiadomości zostały zachowane." })
        .eq("campaign_id", campaign.id)
        .gte("scheduled_at", bounds.start.toISOString())
        .lt("scheduled_at", bounds.end.toISOString())
        .in("status", ["awaiting_approval", "pending", "processing", "failed"])
        .select("id"),
      db
        .from("send_queue")
        .update({ locked_at: null, locked_by: null, attempts: 0, last_error: null })
        .eq("campaign_id", campaign.id)
        .eq("status", "sent")
        .not("locked_at", "is", null)
        .select("id"),
      db
        .from("campaign_runs")
        .update({ status: "failed", finished_at: new Date().toISOString(), errors: ["Run zamknięty resetem kampanii."] })
        .eq("campaign_id", campaign.id)
        .eq("status", "running")
        .select("id"),
    ]);

    const firstError = sentToday.error || cancelledQueue.error || releasedQueue.error || failedRuns.error;
    if (firstError) throw firstError;

    const { error: campaignUpdateError } = await db
      .from("campaigns")
      .update({
        locked_at: null,
        locked_by: null,
        next_run_at: nextRunAt,
        consecutive_send_failures: 0,
        paused_reason: null,
        paused_at: null,
      })
      .eq("id", campaign.id);
    if (campaignUpdateError) throw campaignUpdateError;

    await db.from("system_locks").delete().in("name", RUNNER_LOCK_NAMES);

    await db.from("run_logs").insert({
      client_id: campaign.client_id,
      campaign_id: campaign.id,
      level: "warning",
      stage: "manual_reset",
      message: `Kampania została zresetowana ręcznie. Wysłane dziś wiadomości zostały zachowane: ${sentToday.count || 0}. Bot może zaplanować brakujące wysyłki do dziennego limitu.`,
      metadata: {
        sentToday: sentToday.count || 0,
        cancelledQueue: cancelledQueue.data?.length || 0,
        releasedSentQueue: releasedQueue.data?.length || 0,
        closedRuns: failedRuns.data?.length || 0,
        nextRunAt,
        timeZone,
      },
    });

    await auditSystem(
      "reset_campaign",
      "campaigns",
      campaign.id,
      {
        sentToday: sentToday.count || 0,
        cancelledQueue: cancelledQueue.data?.length || 0,
        releasedSentQueue: releasedQueue.data?.length || 0,
        closedRuns: failedRuns.data?.length || 0,
        nextRunAt,
      },
      auth.user.email,
    );

    return NextResponse.json(
      {
        ok: true,
        campaignId: campaign.id,
        sentToday: sentToday.count || 0,
        cancelledQueue: cancelledQueue.data?.length || 0,
        closedRuns: failedRuns.data?.length || 0,
        nextRunAt,
        message: `Reset gotowy. Wysłane dziś zostają policzone: ${sentToday.count || 0}.`,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się zresetować kampanii."), 500);
  }
}
