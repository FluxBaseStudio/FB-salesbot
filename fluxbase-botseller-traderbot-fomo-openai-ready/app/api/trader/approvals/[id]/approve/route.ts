import { NextResponse } from "next/server";

import { readTraderBody, requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { approveApproval } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const body = await readTraderBody(request);
    const result = await approveApproval(auth.actor, id, body.amount ? String(body.amount) : null);
    return NextResponse.json({ ok: true, ...result }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad akceptacji propozycji."), 500);
  }
}
