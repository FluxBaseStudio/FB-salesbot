import { NextResponse } from "next/server";

import { adminDb } from "@/lib/supabaseAdmin";
import { signupOrderToInsertPayload, validateSignupOrderPayload } from "@/lib/signupOrder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateSignupOrderPayload(body, { requireSmtpPass: false });
    if (!validation.ok) return jsonError(validation.errors.join(" "), 400);

    const { data, error } = await adminDb()
      .from("signup_orders")
      .insert(signupOrderToInsertPayload(validation.data, "pending"))
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data?.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się zapisać zgłoszenia.";
    console.error("signup order failed", error);
    return jsonError(message, 500);
  }
}
