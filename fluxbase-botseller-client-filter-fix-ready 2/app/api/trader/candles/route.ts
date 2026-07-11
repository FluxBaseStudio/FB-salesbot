import { NextResponse } from "next/server";

import { requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { getTraderCandles } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const symbol = (url.searchParams.get("symbol") || "DOGEUSDT").toUpperCase();
    const timeframe = url.searchParams.get("timeframe") || "1h";
    return NextResponse.json({ candles: await getTraderCandles(symbol, timeframe) }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad pobierania wykresu."), 500);
  }
}
