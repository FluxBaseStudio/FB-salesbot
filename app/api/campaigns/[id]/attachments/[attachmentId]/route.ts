import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { removeCampaignAttachmentFromStorage } from "@/lib/attachmentStorage";
import { auditSystem } from "@/lib/signupOrder";
import { adminDb } from "@/lib/supabaseAdmin";
import { validateRecordId } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; attachmentId: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const campaignId = validateRecordId(params.id);
  const attachmentId = validateRecordId(params.attachmentId);
  if (!campaignId.ok) return jsonError(campaignId.errors.join(" "), 400);
  if (!attachmentId.ok) return jsonError(attachmentId.errors.join(" "), 400);

  try {
    const body = await request.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if (typeof body.is_active === "boolean") update.is_active = body.is_active;
    if (typeof body.file_name === "string" && body.file_name.trim()) update.file_name = body.file_name.trim().slice(0, 180);
    if (!Object.keys(update).length) return jsonError("Brak danych do aktualizacji załącznika.", 400);

    const { error } = await adminDb()
      .from("campaign_attachments")
      .update(update)
      .eq("id", attachmentId.data)
      .eq("campaign_id", campaignId.data);
    if (error) throw error;

    await auditSystem("update_campaign_attachment", "campaign_attachments", attachmentId.data, { campaign_id: campaignId.data, ...update }, auth.user.email);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się zapisać załącznika."), 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string; attachmentId: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const campaignId = validateRecordId(params.id);
  const attachmentId = validateRecordId(params.attachmentId);
  if (!campaignId.ok) return jsonError(campaignId.errors.join(" "), 400);
  if (!attachmentId.ok) return jsonError(attachmentId.errors.join(" "), 400);

  try {
    const db = adminDb();
    const { data: attachment, error: loadError } = await db
      .from("campaign_attachments")
      .select("storage_bucket,storage_path")
      .eq("id", attachmentId.data)
      .eq("campaign_id", campaignId.data)
      .maybeSingle();
    if (loadError) throw loadError;

    const { error } = await db
      .from("campaign_attachments")
      .delete()
      .eq("id", attachmentId.data)
      .eq("campaign_id", campaignId.data);
    if (error) throw error;
    await removeCampaignAttachmentFromStorage(attachment?.storage_path, attachment?.storage_bucket || undefined);
    await auditSystem("delete_campaign_attachment", "campaign_attachments", attachmentId.data, { campaign_id: campaignId.data }, auth.user.email);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się usunąć załącznika."), 500);
  }
}
