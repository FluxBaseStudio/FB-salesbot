import { NextResponse } from "next/server";

import { getPlan } from "@/lib/pricing";
import { adminDb } from "@/lib/supabaseAdmin";
import { signupOrderToInsertPayload, validateSignupOrderPayload } from "@/lib/signupOrder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function safeEmail(value: unknown, fallback: string) {
  const email = text(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : fallback;
}

function draftPayload(raw: Record<string, unknown>) {
  const draftEmail = safeEmail(raw.contact_email, `draft-${crypto.randomUUID()}@fluxbase.local`);
  const plan = getPlan(text(raw.plan_id));
  const targetIndustries = text(raw.target_industries) || "Szkic, klient jeszcze nie uzupełnił targetu";
  return {
    ...raw,
    company_name: text(raw.company_name) || "Nieuzupełniona firma",
    contact_email: draftEmail,
    target_industries: targetIndustries,
    company_description: text(raw.company_description) || "Szkic, klient jeszcze nie uzupełnił opisu firmy",
    promoted_service: text(raw.promoted_service) || "Szkic, klient jeszcze nie uzupełnił promowanej usługi",
    smtp_user: text(raw.smtp_user) || draftEmail,
    smtp_reply_to: text(raw.smtp_reply_to) || text(raw.reply_destination_email) || draftEmail,
    smtp_pass: text(raw.smtp_pass) || "",
    smtp_host: text(raw.smtp_host) || "smtp.gmail.com",
    smtp_port: text(raw.smtp_port) || "465",
    plan_id: plan.id,
  };
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const validation = validateSignupOrderPayload(draftPayload(raw), { requireSmtpPass: false });
    if (!validation.ok) return jsonError(validation.errors.join(" "), 400);

    const requestedId = text(raw.order_id);
    const step = Number(text(raw.onboarding_step) || 0);
    const payload = {
      ...signupOrderToInsertPayload(validation.data, "draft"),
      onboarding_step: Number.isFinite(step) ? step : 0,
      onboarding_step_label: text(raw.onboarding_step_label) || "Szkic",
      onboarding_completed: Boolean(raw.onboarding_completed),
      updated_at: new Date().toISOString(),
    };

    if (requestedId) {
      const { data, error } = await adminDb()
        .from("signup_orders")
        .update(payload)
        .eq("id", requestedId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (data?.id) return NextResponse.json({ ok: true, id: data.id }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data, error } = await adminDb()
      .from("signup_orders")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się zapisać szkicu zamówienia.";
    console.error("signup draft failed", error);
    return jsonError(message, 500);
  }
}
