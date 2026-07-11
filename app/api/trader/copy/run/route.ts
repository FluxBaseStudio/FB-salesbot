import { NextResponse } from "next/server";

import {
  requireTraderAdmin,
  traderErrorMessage,
  traderJsonError,
  traderNoStoreHeaders,
} from "@/lib/trader/api";
import { runFomoCopyEngine } from "@/lib/trader/copyServer";
import { runLiveExecutor } from "@/lib/trader/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const analysis = await runFomoCopyEngine(auth.actor);
    const live =
      Number((analysis as { promoted?: number }).promoted || 0) > 0
        ? await runLiveExecutor(auth.actor)
        : null;
    return NextResponse.json(
      { ok: true, ...analysis, live },
      { headers: traderNoStoreHeaders },
    );
  } catch (error) {
    return traderJsonError(
      traderErrorMessage(error, "Blad silnika FOMO copy tradingu."),
      500,
    );
  }
}
