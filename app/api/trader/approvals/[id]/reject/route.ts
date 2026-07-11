import { NextResponse } from "next/server";

import { requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { rejectApproval } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    return NextResponse.json({ ok: true, approval: await rejectApproval(auth.actor, id) }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad odrzucenia propozycji."), 500);
  }
}
