import { NextResponse } from "next/server";

import { deleteTraderAiBot } from "@/lib/trader/aiBots";
import { requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    return NextResponse.json(await deleteTraderAiBot(auth.actor, id), { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Błąd usuwania bota OpenAI."), 400);
  }
}
