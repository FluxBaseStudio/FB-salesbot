import { NextResponse } from "next/server";

import { toggleTraderAiBot } from "@/lib/trader/aiBots";
import { readTraderBody, requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const [{ id }, body] = await Promise.all([context.params, readTraderBody(request)]);
    return NextResponse.json({ ok: true, bot: await toggleTraderAiBot(auth.actor, id, body.active === true) }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Błąd zmiany statusu bota OpenAI."), 400);
  }
}
