import { NextResponse } from "next/server";

import { processDueFollowUps } from "@/lib/bot/messageWorkflow";
import { acquireSystemLock, releaseSystemLock } from "@/lib/bot/runLock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const MAIL_RUN_LOCK = "followups-runner";

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
  if (!authorized(request)) return jsonError("Brak dostępu do crona follow-upów.", 401);

  const lockId = await acquireSystemLock(MAIL_RUN_LOCK, 15);
  if (!lockId) {
    return NextResponse.json(
      { ok: true, processed: 0, skipped: "Kampania albo inna wysyłka już działa. Follow-upy poczekają na kolejny cron." },
      { headers: noStoreHeaders },
    );
  }

  try {
    const result = await processDueFollowUps(30);
    return NextResponse.json({ ok: true, ...result }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd crona follow-upów."), 500);
  } finally {
    await releaseSystemLock(MAIL_RUN_LOCK, lockId);
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
