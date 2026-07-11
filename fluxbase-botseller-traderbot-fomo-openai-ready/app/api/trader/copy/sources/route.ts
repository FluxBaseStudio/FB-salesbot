import { NextResponse } from "next/server";

import { readTraderBody, requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { upsertFomoSource } from "@/lib/trader/copyServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const source = await upsertFomoSource(auth.actor, await readTraderBody(request));
    return NextResponse.json({ ok: true, source }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad zapisu zrodla FOMO."), 500);
  }
}
