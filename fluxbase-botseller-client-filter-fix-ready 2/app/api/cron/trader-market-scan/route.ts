import { NextResponse } from "next/server";

import { traderCronAuthorized, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { runMarketScan } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleCron(request: Request) {
  if (!traderCronAuthorized(request)) return traderJsonError("Brak dostepu do crona TraderBota.", 401);
  try {
    return NextResponse.json({ ok: true, ...(await runMarketScan()) }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad crona skanowania rynku."), 500);
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
