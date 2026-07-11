import { NextResponse } from "next/server";

import { readTraderBody, requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { getTraderOverview, saveTraderSettings } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const overview = await getTraderOverview(auth.actor);
    return NextResponse.json({ settings: overview.settings }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad odczytu ustawien paper tradingu."), 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const settings = await saveTraderSettings(auth.actor, await readTraderBody(request));
    return NextResponse.json({ ok: true, settings }, { headers: traderNoStoreHeaders });
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad zapisu ustawien paper tradingu."), 500);
  }
}
