import { NextResponse } from "next/server";

import { upsertTraderAiBot } from "@/lib/trader/aiBots";
import { readTraderBody, requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await readTraderBody(request);
    return NextResponse.json({ ok: true, bot: await upsertTraderAiBot(auth.actor, body) }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Błąd zapisu bota OpenAI."), 400);
  }
}
