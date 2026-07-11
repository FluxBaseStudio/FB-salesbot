import { NextResponse } from "next/server";

import { getTraderAiBotsOverview } from "@/lib/trader/aiBots";
import { requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await getTraderAiBotsOverview(), { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Błąd odczytu botów OpenAI."), 500);
  }
}
