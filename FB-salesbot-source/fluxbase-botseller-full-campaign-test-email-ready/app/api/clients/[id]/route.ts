import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { clientPayloadToDb } from "@/lib/clientDb";
import { adminDb } from "@/lib/supabaseAdmin";
import { CLIENT_SAFE_SELECT } from "@/lib/types";
import { validateClientPayload, validateRecordId } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const VISIBLE_MESSAGE_STATUSES = ["sent", "delivered", "opened", "replied", "follow_up_sent", "bounced", "spam", "unsubscribed"] as const;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function readClientDetails(id: string) {
  const db = adminDb();
  const [client, campaigns, leads, messages] = await Promise.all([
    db.from("client_accounts").select(CLIENT_SAFE_SELECT).eq("id", id).single(),
    db.from("campaigns").select("*, client_accounts(company_name)").eq("client_id", id).order("created_at", { ascending: false }),
    db
      .from("leads")
      .select("*, client_accounts(company_name), campaigns(name)")
      .eq("client_id", id)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("messages")
      .select("*, client_accounts(company_name), campaigns(name), leads(company_name)")
      .eq("client_id", id)
      .in("status", VISIBLE_MESSAGE_STATUSES as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const error = client.error || campaigns.error || leads.error || messages.error;
  if (error) throw error;

  return {
    client: client.data,
    campaigns: campaigns.data || [],
    leads: leads.data || [],
    messages: messages.data || [],
    counts: {
      campaigns: campaigns.data?.length || 0,
      leads: leads.data?.length || 0,
      messages: messages.data?.length || 0,
    },
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    return NextResponse.json(await readClientDetails(idValidation.data), { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd odczytu klienta."), 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    const validation = validateClientPayload(await request.json());
    if (!validation.ok) return jsonError(validation.errors.join(" "), 400);

    const { data, error } = await adminDb()
      .from("client_accounts")
      .update(clientPayloadToDb(validation.data))
      .eq("id", idValidation.data)
      .select(CLIENT_SAFE_SELECT)
      .single();

    if (error) throw error;
    return NextResponse.json({ client: data }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd aktualizacji klienta."), 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    const { error } = await adminDb().from("client_accounts").delete().eq("id", idValidation.data);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd usuwania klienta."), 500);
  }
}
