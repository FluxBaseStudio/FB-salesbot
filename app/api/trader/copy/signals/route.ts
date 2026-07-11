import { NextResponse } from "next/server";

import { readTraderBody, requireTraderAdmin, traderErrorMessage, traderJsonError, traderNoStoreHeaders } from "@/lib/trader/api";
import { importFomoSignal, runFomoCopyEngine } from "@/lib/trader/copyServer";
import { runLiveExecutor } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await readTraderBody(request);
    const signal = await importFomoSignal(auth.actor, body, body);
    const analysis = await runFomoCopyEngine(auth.actor, signal.id);
    const live =
      Number((analysis as { promoted?: number }).promoted || 0) > 0
        ? await runLiveExecutor(auth.actor)
        : null;
    return NextResponse.json(
      { ok: true, signal, analysis, live },
      { headers: traderNoStoreHeaders },
    );
  } catch (error) {
    return traderJsonError(traderErrorMessage(error, "Blad importu sygnalu FOMO."), 500);
  }
}
