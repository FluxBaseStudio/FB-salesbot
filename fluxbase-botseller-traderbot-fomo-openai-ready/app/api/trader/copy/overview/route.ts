import { NextResponse } from "next/server";

import { requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { getFomoCopyOverview } from "@/lib/trader/copyServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await getFomoCopyOverview(), { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad odczytu FOMO copy tradingu."), 500);
  }
}
