import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { sendLeadEmail } from "@/lib/bot/mailer";
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
    const body = await request.json().catch(() => ({}));
    const to = typeof body?.to === "string" && body.to.includes("@") ? body.to.trim() : auth.user.email;
    const { data: client, error } = await adminDb().from("client_accounts").select("*").eq("id", id.data).single();
    if (error) throw error;
    await sendLeadEmail({
      client: client as any,
      to,
      subject: "Test SMTP FluxBase BotSeller",
      body: "To jest testowa wiadomość SMTP z panelu FluxBase BotSeller. Jeśli ją widzisz, konfiguracja wysyłki działa.",
    });
    await adminDb().from("audit_logs").insert({ actor_email: auth.user.email, action: "test_smtp", resource: "client_accounts", resource_id: id.data, details: { to } });
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Test SMTP nie powiódł się."), 500);
  }
}
