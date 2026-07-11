import { NextResponse } from "next/server";

import {
  traderCronAuthorized,
  traderErrorMessage,
  traderJsonError,
  traderNoStoreHeaders,
} from "@/lib/trader/api";
import { runFomoCopyEngine } from "@/lib/trader/copyServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleCron(request: Request) {
  if (!traderCronAuthorized(request))
    return traderJsonError("Brak dostepu do FOMO copy engine.", 401);
  try {
    return NextResponse.json(
      { ok: true, ...(await runFomoCopyEngine()) },
      { headers: traderNoStoreHeaders },
    );
  } catch (error) {
    return traderJsonError(
      traderErrorMessage(error, "Blad FOMO copy engine."),
      500,
    );
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
