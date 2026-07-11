import { NextResponse } from "next/server";

import { readTraderBody, requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { startLiveTrading } from "@/lib/trader/server";
import type { TraderTradingMode } from "@/lib/trader/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await readTraderBody(request);
    const mode = body.mode === "automatic" ? "automatic" : "approval_required";
    return NextResponse.json({ ok: true, settings: await startLiveTrading(auth.actor, mode as TraderTradingMode) }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad uruchamiania live tradingu."), 500);
  }
}
