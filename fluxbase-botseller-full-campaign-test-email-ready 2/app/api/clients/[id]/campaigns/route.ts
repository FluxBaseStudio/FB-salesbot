import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { adminDb } from "@/lib/supabaseAdmin";
import { validateCampaignPayload, validateRecordId } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    const { data, error } = await adminDb()
      .from("campaigns")
      .select("*, client_accounts(company_name)")
      .eq("client_id", idValidation.data)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ items: data || [] }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd odczytu kampanii klienta."), 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    const body = await request.json();
    const validation = validateCampaignPayload({ ...body, client_id: idValidation.data });
    if (!validation.ok) return jsonError(validation.errors.join(" "), 400);

    const { data, error } = await adminDb().from("campaigns").insert(validation.data).select("*").single();
    if (error) throw error;
    return NextResponse.json({ campaign: data }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd zapisu kampanii klienta."), 500);
  }
}
