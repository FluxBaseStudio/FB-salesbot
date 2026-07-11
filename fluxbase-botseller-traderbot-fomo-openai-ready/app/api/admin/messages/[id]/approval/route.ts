import crypto from "crypto";
import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { adminDb } from "@/lib/supabaseAdmin";
import { validateRecordId } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status = 400) {
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
    const action = String(body?.action || "");
    if (!["approve", "reject"].includes(action)) return jsonError("Nieobsługiwana akcja akceptacji.", 400);

    const db = adminDb();
    const { data: message, error } = await db
      .from("messages")
      .select("id,client_id,campaign_id,lead_id,subject,body,email_to,status,tracking_id,leads(*)")
      .eq("id", idValidation.data)
      .single();
    if (error) throw error;
    if (!message) return jsonError("Nie znaleziono wiadomości.", 404);
    if (message.status !== "draft") return jsonError("Tę wiadomość już obsłużono albo nie wymaga akceptacji.", 409);

    if (action === "reject") {
      await db.from("messages").update({ status: "failed", last_error: "Odrzucone przez admina przed wysyłką.", failed_at: new Date().toISOString() }).eq("id", message.id);
      if (message.lead_id) await db.from("leads").update({ status: "do_not_contact" }).eq("id", message.lead_id);
      return NextResponse.json({ ok: true, status: "rejected" }, { headers: noStoreHeaders });
    }

    const lead = Array.isArray(message.leads) ? message.leads[0] : message.leads;
    await db.from("send_queue").insert({
      client_id: message.client_id,
      campaign_id: message.campaign_id,
      scheduled_at: new Date().toISOString(),
      status: "pending",
      email_to: message.email_to,
      subject: message.subject || "",
      body: message.body || "",
      tracking_id: message.tracking_id || crypto.randomUUID(),
      lead_id: message.lead_id,
      lead_payload: {
        company_name: lead?.company_name || "Lead",
        industry: lead?.industry || null,
        city: lead?.city || null,
        phone: lead?.phone || null,
        website: lead?.website || null,
        email: message.email_to,
        google_maps_url: lead?.google_maps_url || null,
        source: lead?.source || "admin_approved_draft",
        score: lead?.score || 0,
        main_problem: lead?.main_problem || null,
        ai_summary: lead?.ai_summary || null,
      },
    });

    await db.from("messages").update({ status: "queued", approved_at: new Date().toISOString(), last_error: null }).eq("id", message.id);
    if (message.lead_id) await db.from("leads").update({ status: "approved" }).eq("id", message.lead_id);
    return NextResponse.json({ ok: true, status: "approved" }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd akceptacji wiadomości."), 500);
  }
}
