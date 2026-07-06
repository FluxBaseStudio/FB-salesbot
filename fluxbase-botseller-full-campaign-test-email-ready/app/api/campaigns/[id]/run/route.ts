import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { planCampaignDay } from "@/lib/bot/dailyPlanner";
import { acquireSystemLock, releaseSystemLock } from "@/lib/bot/runLock";
import { validateRecordId } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const CAMPAIGN_RUN_LOCK = "campaign-runner";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  const lockId = await acquireSystemLock(CAMPAIGN_RUN_LOCK, 55);
  if (!lockId) return jsonError("Inna kampania właśnie działa. Poczekaj, aż skończy, żeby nie odpalać kilku wysyłek naraz.", 409);

  try {
    const body = await request.json().catch(() => ({}));
    const requestedLimit = Number(body?.limit || 0);
    const { campaign, stats, runId } = await planCampaignDay(idValidation.data, { requestedLimit });
    if (!campaign) return jsonError("Nie udało się odczytać kampanii po planowaniu.", 500);

    return NextResponse.json({ ok: true, campaignId: campaign.id, runId, stats }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd planowania bota."), 500);
  } finally {
    await releaseSystemLock(CAMPAIGN_RUN_LOCK, lockId);
  }
}
