import { NextResponse } from "next/server";

import { createAdminNotification } from "@/lib/adminNotifications";
import { verifyAdmin } from "@/lib/adminAuth";
import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const decision = String(body.decision || "").trim();
  const note = String(body.note || "").trim();
  if (!["good", "bad", "blacklist"].includes(decision)) return jsonError("Dozwolone decision: good, bad albo blacklist.", 400);

  const db = adminDb();
  const { data: lead, error } = await db.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!lead) return jsonError("Nie znaleziono leada.", 404);

  const metadata = { decision, note, company: lead.company_name, email: lead.email, website: lead.website, score: lead.score };
  await db.from("run_logs").insert({
    client_id: lead.client_id,
    campaign_id: lead.campaign_id,
    level: decision === "good" ? "info" : "warning",
    stage: "lead_quality_feedback",
    message: decision === "good" ? `Lead zaakceptowany jakościowo: ${lead.company_name}.` : `Lead oznaczony jako słaby/wykluczony: ${lead.company_name}.`,
    metadata,
  });

  if (decision === "good") {
    await db.from("leads").update({ ai_summary: `${lead.ai_summary || ""}\n\n[Feedback admina: dobry lead] ${note}`.trim() }).eq("id", id);
  } else {
    await db.from("leads").update({ status: "do_not_contact", ai_summary: `${lead.ai_summary || ""}\n\n[Feedback admina: odrzucony lead] ${note}`.trim() }).eq("id", id);
  }

  if (decision === "blacklist" && lead.email) {
    await db.from("suppression_list").insert({ email: lead.email, domain: lead.website || null, company_name: lead.company_name, scope: "global", reason: note || "Lead odrzucony przez admina i dodany do blacklisty." });
    await createAdminNotification({ tone: "warning", title: "Lead dodany do blacklisty", message: `${lead.company_name} (${lead.email}) został dodany do suppression list przez feedback jakościowy.`, resource: "leads", resourceId: id, dedupeKey: `lead-feedback:blacklist:${id}` });
  }

  return NextResponse.json({ ok: true, decision, leadId: id }, { headers });
}
