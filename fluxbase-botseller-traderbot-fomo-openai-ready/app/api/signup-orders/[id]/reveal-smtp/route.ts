import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { decryptSecret } from "@/lib/cryptoSecrets";
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
  const id = validateRecordId(params.id);
  if (!id.ok) return jsonError(id.errors.join(" "), 400);

  try {
    const { data: order, error } = await adminDb()
      .from("signup_orders")
      .select("id,company_name,smtp_pass_encrypted,smtp_pass_iv,smtp_pass_auth_tag")
      .eq("id", id.data)
      .single();
    if (error) throw error;
    if (!order?.smtp_pass_encrypted || !order.smtp_pass_iv || !order.smtp_pass_auth_tag) {
      return jsonError("To zamówienie nie ma zapisanego hasła SMTP.", 404);
    }

    const smtpPass = decryptSecret({
      encrypted_value: order.smtp_pass_encrypted,
      iv: order.smtp_pass_iv,
      auth_tag: order.smtp_pass_auth_tag,
    });
    await auditSystem("reveal_order_smtp_pass", "signup_orders", id.data, { company_name: order.company_name }, auth.user.email);
    return NextResponse.json({ ok: true, smtp_pass: smtpPass }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się odczytać hasła SMTP."), 500);
  }
}
