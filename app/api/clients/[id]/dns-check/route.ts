import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { checkDomainDeliverability } from "@/lib/dnsChecker";
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
    const { data: client, error } = await adminDb()
      .from("client_accounts")
      .select("id,website,smtp_user,sender_email,contact_email,dkim_selector")
      .eq("id", id.data)
      .single();
    if (error) throw error;
    if (!client) return jsonError("Nie znaleziono klienta.", 404);

    const result = await checkDomainDeliverability({
      smtpUser: client.smtp_user || client.sender_email || client.contact_email,
      website: client.website,
      dkimSelector: typeof body?.dkim_selector === "string" ? body.dkim_selector : client.dkim_selector,
    });

    return NextResponse.json({ ok: true, ...result }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się sprawdzić DNS."), 500);
  }
}
