import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { checkRateLimit, requestIp } from "@/lib/rateLimit";
import {
  traderErrorMessage,
  traderJsonError,
  traderNoStoreHeaders,
} from "@/lib/trader/api";
import { importFomoSignal, runFomoCopyEngine } from "@/lib/trader/copyServer";
import { runLiveExecutor } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_WEBHOOK_BYTES = 64 * 1024;

function constantTimeEqual(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorized(request: Request) {
  const expected = process.env.FOMO_WEBHOOK_SECRET;
  if (!expected || expected.length < 24) return false;
  const auth = request.headers.get("authorization") || "";
  const headerSecret = request.headers.get("x-fomo-webhook-secret") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return (
    constantTimeEqual(bearer, expected) ||
    constantTimeEqual(headerSecret, expected)
  );
}

export async function POST(request: Request) {
  const ip = requestIp(request);
  const limit = checkRateLimit(`fomo-webhook:${ip}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Za duzo zadan do webhooka FOMO." },
      {
        status: 429,
        headers: {
          ...traderNoStoreHeaders,
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }
  if (!authorized(request))
    return traderJsonError("Brak dostepu do webhooka FOMO.", 401);

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return traderJsonError("Dane webhooka FOMO sa zbyt duze.", 413);
  }

  try {
    const raw = await request.text();
    if (!raw || Buffer.byteLength(raw, "utf8") > MAX_WEBHOOK_BYTES) {
      return traderJsonError(
        "Dane webhooka FOMO sa puste lub zbyt duze.",
        raw ? 413 : 400,
      );
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return traderJsonError("Webhook FOMO wymaga poprawnego JSON.", 400);
    }
    if (!body || Array.isArray(body) || typeof body !== "object") {
      return traderJsonError("Webhook FOMO wymaga obiektu JSON.", 400);
    }
    if (
      typeof body.external_signal_id !== "string" ||
      !body.external_signal_id.trim()
    ) {
      return traderJsonError(
        "Webhook FOMO wymaga external_signal_id do ochrony przed duplikatami.",
        400,
      );
    }
    if (
      typeof body.source_id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.source_id)
    ) {
      return traderJsonError(
        "Webhook FOMO wymaga poprawnego source_id z panelu.",
        400,
      );
    }

    const signal = await importFomoSignal(null, body, body);
    const analysis = await runFomoCopyEngine(null, signal.id);
    const live =
      Number((analysis as { promoted?: number }).promoted || 0) > 0
        ? await runLiveExecutor(null)
        : null;
    return NextResponse.json(
      {
        ok: true,
        signalId: signal.id,
        status: signal.status,
        analysis,
        live,
      },
      { headers: traderNoStoreHeaders },
    );
  } catch (error) {
    const message = traderErrorMessage(error, "Blad webhooka FOMO.");
    const status =
      /juz zapisany|nieprawid|wymaga|podaj|musi|wylaczone|nieaktywne/i.test(
        message,
      )
        ? 400
        : 500;
    return traderJsonError(message, status);
  }
}
