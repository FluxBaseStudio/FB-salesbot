import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { getSendCapacity, requiredCampaignNumber, requiredCampaignTimeZone } from "@/lib/bot/sendSafety";
import { adminDb } from "@/lib/supabaseAdmin";
import type { Campaign, ClientAccount } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

type CampaignWithClient = Campaign & { client_accounts: ClientAccount | null };

function jsonError(error: string, status = 400) {
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
  return new Date(guess.getTime() - timeZoneOffsetMs(guess, timeZone));
}

function validateCampaignScheduler(campaign: Campaign) {
  const timeZone = requiredCampaignTimeZone(campaign);
  const startHour = Math.round(requiredCampaignNumber(campaign.workday_start_hour, "Godzina startu pracy bota"));
  const endHour = Math.round(requiredCampaignNumber(campaign.workday_end_hour, "Godzina końca pracy bota"));
  const dailyLimit = Math.round(requiredCampaignNumber(campaign.daily_limit, "Docelowa liczba maili dziennie"));
  if (startHour < 0 || startHour > 23) throw new Error("Godzina startu musi być w zakresie 0-23.");
  if (endHour < 1 || endHour > 24 || endHour <= startHour) throw new Error("Godzina końca musi być późniejsza niż start i w zakresie 1-24.");
  if (dailyLimit < 1 || dailyLimit > 500) throw new Error("Docelowa liczba maili dziennie musi być w zakresie 1-500.");
  const now = new Date();
  const start = zonedDateAtHour(now, startHour, timeZone);
  const end = zonedDateAtHour(now, endHour, timeZone);
  const workWindowMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (workWindowMinutes <= 0) throw new Error("Okno pracy musi mieć dodatnią długość.");
  const intervalMinutes = Math.floor(workWindowMinutes / dailyLimit);
  if (intervalMinutes < 1) throw new Error("Interwał wychodzi poniżej 1 minuty. Zmniejsz limit albo wydłuż okno pracy.");
  return { timeZone, startHour, endHour, dailyLimit, workWindowMinutes, intervalMinutes };
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const body = await request.json().catch(() => ({}));
    const campaignId = typeof body?.campaignId === "string" ? body.campaignId : typeof body?.campaign_id === "string" ? body.campaign_id : null;
    if (!campaignId) return jsonError("Podaj campaignId.", 400);

    const { data: campaign, error } = await adminDb()
      .from("campaigns")
      .select("*, client_accounts(*)")
      .eq("id", campaignId)
      .single<CampaignWithClient>();
    if (error) throw error;
    if (!campaign?.client_accounts) return jsonError("Kampania nie ma przypisanego klienta.", 404);

    const scheduler = validateCampaignScheduler(campaign);
    const capacity = await getSendCapacity(campaign.client_accounts, campaign);

    const { count: activeCampaigns } = await adminDb()
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("auto_run_enabled", true);

    const maxStableCampaigns = Math.max(Math.floor(scheduler.intervalMinutes), 1);
    const activeItems = activeCampaigns || 0;

    return NextResponse.json(
      {
        ok: activeItems <= maxStableCampaigns,
        mode: "dry_run_no_google_no_openai_no_smtp",
        campaign: { id: campaign.id, name: campaign.name, status: campaign.status, autoRun: campaign.auto_run_enabled, autoSend: campaign.auto_send_enabled, botId: campaign.bot_id },
        scheduler,
        capacity,
        stableWorkerCheck: {
          activeSchedulerItems: activeItems,
          maxStableCampaignsForThisInterval: maxStableCampaigns,
          ok: activeItems <= maxStableCampaigns,
          note: activeItems <= maxStableCampaigns ? "Ta kampania mieści się w stabilnym rytmie minutowego Vercel Cron." : "Za dużo aktywnych kampanii dla tego interwału na jednym workerze Vercel.",
        },
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się wykonać testu kampanii."), 500);
  }
}
