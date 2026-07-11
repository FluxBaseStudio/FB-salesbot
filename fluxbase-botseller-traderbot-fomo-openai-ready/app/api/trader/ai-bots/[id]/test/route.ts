import { NextResponse } from "next/server";

import { testTraderAiBot } from "@/lib/trader/aiBots";
import {
  requireTraderAdmin,
  traderErrorMessage,
  traderJsonError,
  traderNoStoreHeaders,
} from "@/lib/trader/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTraderAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    return NextResponse.json(await testTraderAiBot(auth.actor, id), {
      headers: traderNoStoreHeaders,
    });
  } catch (error) {
    return traderJsonError(
      traderErrorMessage(error, "Test bota OpenAI nie powiódł się."),
      400,
    );
  }
}
