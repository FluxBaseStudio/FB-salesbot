import { NextResponse } from "next/server";

import { planDueCampaigns } from "@/lib/bot/dailyPlanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const secret = request.headers.get("x-cron-secret") || "";
  return auth === `Bearer ${expected}` || secret === expected;
}



async function handleCron(request: Request) {
  if (!authorized(request)) return jsonError("Brak dostępu do crona.", 401);
  try {
    const result = await planDueCampaigns();
    return NextResponse.json({ ok: true, mode: "dynamic_work_window_scheduler_one_lead_per_due_slot", ...result }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd crona."), 500);
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
