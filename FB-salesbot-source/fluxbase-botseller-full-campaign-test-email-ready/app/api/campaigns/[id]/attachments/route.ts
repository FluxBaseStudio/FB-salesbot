import { NextResponse } from "next/server";
import crypto from "crypto";

import { verifyAdmin } from "@/lib/adminAuth";
import { attachmentStoragePath, uploadCampaignAttachmentToStorage } from "@/lib/attachmentStorage";
import { auditSystem } from "@/lib/signupOrder";
import { adminDb } from "@/lib/supabaseAdmin";
import { validateRecordId } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function cleanFileName(value: string) {
  return value.replace(/[\\/\0]/g, "-").replace(/\s+/g, " ").trim().slice(0, 180) || "zalacznik";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const id = validateRecordId(params.id);
  if (!id.ok) return jsonError(id.errors.join(" "), 400);

  try {
    const { data, error } = await adminDb()
      .from("campaign_attachments")
      .select("id,client_id,campaign_id,file_name,mime_type,file_size_bytes,storage_bucket,storage_path,is_active,created_at")
      .eq("campaign_id", id.data)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ items: data || [] }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się pobrać załączników."), 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const id = validateRecordId(params.id);
  if (!id.ok) return jsonError(id.errors.join(" "), 400);

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Brakuje pliku do dodania.", 400);
    if (!file.size) return jsonError("Plik jest pusty.", 400);
    if (file.size > MAX_ATTACHMENT_BYTES) return jsonError("Plik jest za duży. Maksymalnie 5 MB na jeden załącznik.", 400);
    if (file.type && !allowedMimeTypes.has(file.type)) {
      return jsonError("Nieobsługiwany typ pliku. Dozwolone: PDF, DOC/DOCX, XLS/XLSX, PNG, JPG, WEBP, TXT, CSV.", 400);
    }

    const db = adminDb();
    const { data: campaign, error: campaignError } = await db.from("campaigns").select("id,client_id").eq("id", id.data).single();
    if (campaignError) throw campaignError;
    if (!campaign) return jsonError("Nie znaleziono kampanii.", 404);

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = cleanFileName(file.name || String(form.get("file_name") || "zalacznik"));
    const attachmentId = crypto.randomUUID();
    const storagePath = attachmentStoragePath({ clientId: campaign.client_id, campaignId: campaign.id, attachmentId, fileName });
    const stored = await uploadCampaignAttachmentToStorage({ path: storagePath, buffer, mimeType: file.type || "application/octet-stream" });

    const { data: inserted, error } = await db
      .from("campaign_attachments")
      .insert({
        id: attachmentId,
        client_id: campaign.client_id,
        campaign_id: campaign.id,
        file_name: fileName,
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
        file_data_base64: null,
        storage_bucket: stored.bucket,
        storage_path: stored.path,
        storage_provider: "supabase_storage",
        is_active: true,
      })
      .select("id,file_name,file_size_bytes,storage_path")
      .single();
    if (error) throw error;

    await auditSystem("upload_campaign_attachment", "campaign_attachments", inserted?.id || null, { campaign_id: campaign.id, file_name: fileName, file_size_bytes: file.size, storage_path: stored.path }, auth.user.email);
    return NextResponse.json({ ok: true, item: inserted }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się dodać załącznika."), 500);
  }
}
