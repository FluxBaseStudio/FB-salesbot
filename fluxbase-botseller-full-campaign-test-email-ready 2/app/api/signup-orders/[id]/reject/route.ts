import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : null;
    const { error } = await adminDb()
      .from("signup_orders")
      .update({ status: "rejected", payment_error: reason || null })
      .eq("id", idValidation.data)
      .in("status", ["pending", "pending_payment", "payment_failed"]);
    if (error) throw error;
    await auditSystem("reject_signup_order", "signup_orders", idValidation.data, { reason }, auth.user.email);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się odrzucić zamówienia."), 500);
  }
}
