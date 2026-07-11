import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const params = await context.params;
  const id = validateRecordId(params.id);
  if (!id.ok) return jsonError(id.errors.join(" "), 400);

  try {
    const body = await request.json().catch(() => ({}));
    const { error } = await adminDb().from("api_credentials").update({ is_active: Boolean(body?.is_active) }).eq("id", id.data);
    if (error) throw error;
    await adminDb().from("audit_logs").insert({ actor_email: auth.user.email, action: "secret_status", resource: "api_credentials", resource_id: id.data, details: { is_active: Boolean(body?.is_active) } });
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd aktualizacji sekretu."), 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const params = await context.params;
  const id = validateRecordId(params.id);
  if (!id.ok) return jsonError(id.errors.join(" "), 400);

  try {
    const { error } = await adminDb().from("api_credentials").delete().eq("id", id.data);
    if (error) throw error;
    await adminDb().from("audit_logs").insert({ actor_email: auth.user.email, action: "delete", resource: "api_credentials", resource_id: id.data });
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd usuwania sekretu."), 500);
  }
}
