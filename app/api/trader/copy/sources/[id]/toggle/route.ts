import { NextResponse } from "next/server";

import { readTraderBody, requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { toggleFomoSource } from "@/lib/trader/copyServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return traderJsonError("Nieprawidlowe ID zrodla.", 400);
    const body = await readTraderBody(request);
    const source = await toggleFomoSource(auth.actor, id, body.is_active === true);
    return NextResponse.json({ ok: true, source }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad zmiany zrodla FOMO."), 500);
  }
}
