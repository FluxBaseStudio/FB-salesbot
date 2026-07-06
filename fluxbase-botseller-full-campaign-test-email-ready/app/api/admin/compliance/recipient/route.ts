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

function normalizeEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : null;
}

async function exportRecipient(email: string) {
  const db = adminDb();
  const [leads, messages, queue, suppressions] = await Promise.all([
    db.from("leads").select("*").ilike("email", email),
    db.from("messages").select("*").ilike("email_to", email),
    db.from("send_queue").select("*").ilike("email_to", email),
    db.from("suppression_list").select("*").ilike("email", email),
  ]);
  for (const result of [leads, messages, queue, suppressions]) {
    if (result.error) throw result.error;
  }
  return { email, leads: leads.data || [], messages: messages.data || [], sendQueue: queue.data || [], suppressionList: suppressions.data || [] };
}

async function suppressRecipient(email: string, reason: string) {
  const { error } = await adminDb().from("suppression_list").insert({
    email,
    reason: reason || "Ręczna blokada compliance z panelu admina.",
    scope: "global",
  });
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

async function anonymizeRecipient(email: string) {
  const db = adminDb();
  const masked = `deleted-${Date.now()}@redacted.local`;
  await Promise.all([
    db.from("leads").update({ email: masked, phone: null, status: "do_not_contact", ai_summary: "Dane zanonimizowane przez compliance action." }).ilike("email", email),
    db.from("messages").update({ email_to: masked, body: "[Zanonimizowano treść w ramach compliance action]", status: "unsubscribed" }).ilike("email_to", email),
    db.from("send_queue").update({ email_to: masked, status: "cancelled", body: "[Zanonimizowano treść w ramach compliance action]", last_error: "Anulowano po anonimizacji odbiorcy." }).ilike("email_to", email),
  ]);
  await suppressRecipient(email, "Odbiorca zanonimizowany i globalnie zablokowany.");
  return { masked };
}

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email"));
  if (!email) return jsonError("Podaj poprawny email odbiorcy.", 400);
  const data = await exportRecipient(email);
  return NextResponse.json({ ok: true, mode: "export", data }, { headers });
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const action = String(body.action || "").trim();
  if (!email) return jsonError("Podaj poprawny email odbiorcy.", 400);
  if (!["suppress", "anonymize"].includes(action)) return jsonError("Dozwolone action: suppress albo anonymize.", 400);

  if (action === "suppress") {
    await suppressRecipient(email, String(body.reason || "Ręczna blokada compliance z panelu admina."));
    await createAdminNotification({ tone: "info", title: "Odbiorca dodany do suppression list", message: `${email} został zablokowany globalnie.`, resource: "suppression_list", dedupeKey: `compliance:suppress:${email}` });
    return NextResponse.json({ ok: true, action, email }, { headers });
  }

  const result = await anonymizeRecipient(email);
  await createAdminNotification({ tone: "warning", title: "Odbiorca zanonimizowany", message: `${email} został zanonimizowany i dodany do suppression list.`, resource: "compliance", dedupeKey: `compliance:anonymize:${email}` });
  return NextResponse.json({ ok: true, action, email, result }, { headers });
}
