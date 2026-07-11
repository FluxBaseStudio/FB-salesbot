import { NextResponse } from "next/server";

import {
  traderCronAuthorized,
  traderErrorMessage,
  traderJsonError,
  traderNoStoreHeaders,
} from "@/lib/trader/api";
import { runLiveExecutor } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleCron(request: Request) {
  if (!traderCronAuthorized(request))
    return traderJsonError("Brak dostepu do live executor.", 401);
  try {
    return NextResponse.json(
      { ok: true, ...(await runLiveExecutor()) },
      { headers: traderNoStoreHeaders },
    );
  } catch (error) {
    return traderJsonError(
      traderErrorMessage(error, "Blad live executor."),
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
