import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

import { signupOrderAttachmentStoragePath, uploadSignupOrderAttachmentToStorage } from "@/lib/attachmentStorage";
import { getBaseUrl, getStripe } from "@/lib/stripe/server";
import { getStripePriceEnvNames, getStripePriceId } from "@/lib/pricing";
import { auditSystem } from "@/lib/signupOrder";
import { adminDb } from "@/lib/supabaseAdmin";
import { signupOrderToInsertPayload, validateSignupOrderPayload } from "@/lib/signupOrder";
import { verifySmtpConnection } from "@/lib/bot/smtpTest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_SIGNUP_ATTACHMENTS = 5;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
]);

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function cleanFileName(value: string) {
  return value.replace(/[\\/\0]/g, "-").replace(/\s+/g, " ").trim().slice(0, 180) || "zalacznik";
}

function accepted(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "yes", "on", "tak"].includes(value.toLowerCase());
  return false;
}

async function requestPayloadAndFiles(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const rawPayload = formData.get("payload");
    const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : {};
    const files = formData
      .getAll("attachments")
      .filter((item): item is File => item instanceof File && item.size > 0);
    return { payload, files };
  }
  return { payload: await request.json(), files: [] as File[] };
}

async function saveSignupOrderAttachments(orderId: string, files: File[]) {
  if (!files.length) return [];
  if (files.length > MAX_SIGNUP_ATTACHMENTS) throw new Error(`Możesz dodać maksymalnie ${MAX_SIGNUP_ATTACHMENTS} plików.`);

  const db = adminDb();
  const saved: Array<{ id: string; file_name: string; file_size_bytes: number; storage_path: string }> = [];

  for (const file of files) {
    if (!file.size) continue;
    if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Jeden z plików jest za duży. Maksymalnie 5 MB na załącznik.");
    if (file.type && !allowedMimeTypes.has(file.type)) {
      throw new Error("Nieobsługiwany typ pliku. Dozwolone: PDF, DOC/DOCX, XLS/XLSX, PNG, JPG, WEBP, TXT, CSV.");
    }

    const attachmentId = crypto.randomUUID();
    const fileName = cleanFileName(file.name || "zalacznik");
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = signupOrderAttachmentStoragePath({ orderId, attachmentId, fileName });
    const stored = await uploadSignupOrderAttachmentToStorage({ path: storagePath, buffer, mimeType: file.type || "application/octet-stream" });

    const { data, error } = await db
      .from("signup_order_attachments")
      .insert({
        id: attachmentId,
        order_id: orderId,
        file_name: fileName,
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
        storage_bucket: stored.bucket,
        storage_path: stored.path,
        storage_provider: "supabase_storage",
        is_active: true,
      })
      .select("id,file_name,file_size_bytes,storage_path")
      .single();
    if (error) throw error;
    if (data) saved.push(data);
  }

  if (saved.length) await auditSystem("upload_signup_order_attachments", "signup_order_attachments", orderId, { count: saved.length, files: saved.map((file) => file.file_name) }, "public");
  return saved;
}

export async function POST(request: Request) {
  try {
    const { payload, files } = await requestPayloadAndFiles(request);
    const termsAccepted = accepted(payload?.accepts_terms);
    const recurringContractAccepted = accepted(payload?.accepts_recurring_contract);
    if (!termsAccepted || !recurringContractAccepted) {
      return jsonError("Przed płatnością wymagane jest zaakceptowanie regulaminu oraz potwierdzenie cyklicznej umowy abonamentowej.", 400);
    }
    const validation = validateSignupOrderPayload(payload, { requireSmtpPass: true });
    if (!validation.ok) return jsonError(validation.errors.join(" "), 400);

    const { data } = validation;
    if (data.mailbox_setup_mode !== "fluxbase_setup") {
      await verifySmtpConnection({
        host: data.smtp_host,
        port: data.smtp_port,
        secure: data.smtp_secure,
        user: data.smtp_user,
        pass: data.smtp_pass,
        from: data.smtp_from,
      });
    }
    const priceId = getStripePriceId(data.plan.id);
    if (!priceId) return jsonError(`Brakuje ceny Stripe dla pakietu ${data.plan.name}. Obsługiwane nazwy: ${getStripePriceEnvNames(data.plan.id).join(", ")}.`, 500);

    const headersList = await headers();
    const consentAcceptedAt = new Date().toISOString();
    const orderPayload = {
      ...signupOrderToInsertPayload(data, "pending_payment"),
      stripe_price_id: priceId,
      accepts_terms: termsAccepted,
      accepts_recurring_contract: recurringContractAccepted,
      terms_accepted_at: consentAcceptedAt,
      recurring_contract_accepted_at: consentAcceptedAt,
      consent_ip: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || null,
      consent_user_agent: headersList.get("user-agent") || null,
    };

    const requestedOrderId = typeof payload.order_id === "string" ? payload.order_id : "";
    let order: { id: string } | null = null;

    if (requestedOrderId) {
      const updated = await adminDb()
        .from("signup_orders")
        .update({ ...orderPayload, onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq("id", requestedOrderId)
        .select("id")
        .maybeSingle();
      if (updated.error) throw updated.error;
      order = updated.data;
    }

    if (!order?.id) {
      const inserted = await adminDb()
        .from("signup_orders")
        .insert({ ...orderPayload, onboarding_completed: true, updated_at: new Date().toISOString() })
        .select("id")
        .single();
      if (inserted.error) throw inserted.error;
      order = inserted.data;
    }

    if (!order?.id) throw new Error("Nie udało się utworzyć zamówienia.");

    await saveSignupOrderAttachments(order.id, files);

    const baseUrl = getBaseUrl();
    const lineItems = [{ price: priceId, quantity: 1 }];
    const additionalMailboxPriceId = process.env.STRIPE_PRICE_ADDITIONAL_MAILBOX || process.env.STRIPE_PRICE_MAILBOX || process.env.STRIPE_PRICE_EXTRA_MAILBOX || process.env.STRIPE_ADDITIONAL_MAILBOX_PRICE_ID || "";
    if (data.additional_mailbox_requested) {
      if (!additionalMailboxPriceId) return jsonError("Brakuje ceny Stripe dla dodatkowej skrzynki 599 zł. Obsługiwane nazwy: STRIPE_PRICE_ADDITIONAL_MAILBOX, STRIPE_PRICE_MAILBOX, STRIPE_PRICE_EXTRA_MAILBOX, STRIPE_ADDITIONAL_MAILBOX_PRICE_ID.", 500);
      lineItems.push({ price: additionalMailboxPriceId, quantity: 1 });
    }
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer_email: data.contact_email,
      client_reference_id: order.id,
      line_items: lineItems,
      allow_promotion_codes: true,
      success_url: `${baseUrl}/botseller?payment=success&order=${order.id}`,
      cancel_url: `${baseUrl}/botseller?payment=cancelled&order=${order.id}`,
      metadata: {
        order_id: order.id,
        plan_id: data.plan.id,
        company_name: data.company_name.slice(0, 500),
        daily_emails: String(data.plan.dailyEmails),
        monthly_emails: String(data.plan.monthlyEmails),
        location_scope: data.location_scope,
        attachments_count: String(files.length),
        mailbox_setup_mode: data.mailbox_setup_mode,
        additional_mailbox_requested: String(data.additional_mailbox_requested),
        total_daily_emails: String(data.total_daily_emails),
        accepts_terms: String(termsAccepted),
        accepts_recurring_contract: String(recurringContractAccepted),
        terms_accepted_at: consentAcceptedAt,
      },
      subscription_data: {
        metadata: {
          order_id: order.id,
          plan_id: data.plan.id,
          company_name: data.company_name.slice(0, 500),
          daily_emails: String(data.plan.dailyEmails),
          monthly_emails: String(data.plan.monthlyEmails),
          location_scope: data.location_scope,
          attachments_count: String(files.length),
          mailbox_setup_mode: data.mailbox_setup_mode,
          additional_mailbox_requested: String(data.additional_mailbox_requested),
          total_daily_emails: String(data.total_daily_emails),
          accepts_terms: String(termsAccepted),
          accepts_recurring_contract: String(recurringContractAccepted),
          terms_accepted_at: consentAcceptedAt,
        },
      },
    });

    const { error: updateError } = await adminDb()
      .from("signup_orders")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
        stripe_payment_status: session.payment_status || null,
      })
      .eq("id", order.id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, url: session.url, orderId: order.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się utworzyć płatności Stripe.";
    console.error("stripe checkout failed", error);
    return jsonError(message, 500);
  }
}
