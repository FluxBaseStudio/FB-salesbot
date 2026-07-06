import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { adminDb } from "@/lib/supabaseAdmin";
import { validateRecordId } from "@/lib/validation";

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

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    const { data, error } = await adminDb()
      .from("messages")
      .select("*, client_accounts(company_name), campaigns(name), leads(company_name)")
      .eq("client_id", idValidation.data)
      .in("status", VISIBLE_MESSAGE_STATUSES as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;
    return NextResponse.json({ items: data || [] }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd odczytu wiadomości klienta."), 500);
  }
}
