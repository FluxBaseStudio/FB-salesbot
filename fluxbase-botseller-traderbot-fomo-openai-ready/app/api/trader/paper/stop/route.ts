import { NextResponse } from "next/server";

import { requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { stopPaperTrading } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ ok: true, settings: await stopPaperTrading(auth.actor) }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad zatrzymywania paper tradingu."), 500);
  }
}
