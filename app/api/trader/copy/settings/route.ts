import { NextResponse } from "next/server";

import { readTraderBody, requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { saveFomoCopySettings } from "@/lib/trader/copyServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const settings = await saveFomoCopySettings(auth.actor, await readTraderBody(request));
    return NextResponse.json({ ok: true, settings }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad zapisu ustawien FOMO copy tradingu."), 500);
  }
}
