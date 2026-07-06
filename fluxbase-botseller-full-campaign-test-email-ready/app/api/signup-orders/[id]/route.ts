import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { auditSystem, signupOrderToUpdatePayload } from "@/lib/signupOrder";
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
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    const validation = signupOrderToUpdatePayload(await request.json());
    if (!validation.ok) return jsonError(validation.errors.join(" "), 400);

    const { error } = await adminDb().from("signup_orders").update(validation.data).eq("id", idValidation.data);
    if (error) throw error;

    await auditSystem("update_signup_order", "signup_orders", idValidation.data, { fields: Object.keys(validation.data) }, auth.user.email);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się zapisać zamówienia."), 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    const { error } = await adminDb().from("signup_orders").delete().eq("id", idValidation.data);
    if (error) throw error;
    await auditSystem("delete_signup_order", "signup_orders", idValidation.data, null, auth.user.email);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się usunąć zamówienia."), 500);
  }
}
