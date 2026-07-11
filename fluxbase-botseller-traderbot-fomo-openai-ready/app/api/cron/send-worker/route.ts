import { NextResponse } from "next/server";

import { processSendQueue } from "@/lib/bot/sendQueueWorker";
import { acquireSystemLock, releaseSystemLock } from "@/lib/bot/runLock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const SEND_WORKER_LOCK = "send-queue-worker";

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
  if (!authorized(request)) return jsonError("Brak dostępu do workera wysyłki.", 401);

  const lockId = await acquireSystemLock(SEND_WORKER_LOCK, 3);
  if (!lockId) {
    return NextResponse.json({ ok: true, processed: 0, skipped: "Inny worker wysyłki już działa." }, { headers: noStoreHeaders });
  }

  try {
    const result = await processSendQueue();
    return NextResponse.json({ ok: true, ...result }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd workera wysyłki."), 500);
  } finally {
    await releaseSystemLock(SEND_WORKER_LOCK, lockId);
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
