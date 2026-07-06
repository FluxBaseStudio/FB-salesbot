import { NextResponse } from "next/server";

import { removeCampaignAttachmentFromStorage } from "@/lib/attachmentStorage";
import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const secret = request.headers.get("x-cron-secret") || "";
  return auth === `Bearer ${expected}` || secret === expected;
}

function cutoffHours() {
  const raw = Number(process.env.SIGNUP_ORDER_CLEANUP_HOURS || 48);
  return Math.min(Math.max(Number.isFinite(raw) ? raw : 48, 1), 168);
}

async function cleanupAbandonedOrders() {
  const db = adminDb();
  const cutoff = new Date(Date.now() - cutoffHours() * 60 * 60 * 1000).toISOString();
  const { data: orders, error } = await db
    .from("signup_orders")
    .select("id,status,created_at")
    .in("status", ["pending", "pending_payment", "payment_failed"])
    .is("paid_at", null)
    .lt("created_at", cutoff)
    .limit(100);
  if (error) throw error;

  let cleaned = 0;
  let removedFiles = 0;

  for (const order of orders || []) {
    const { data: attachments, error: attachmentError } = await db
      .from("signup_order_attachments")
      .select("id,storage_bucket,storage_path")
      .eq("order_id", order.id)
      .eq("is_active", true);
    if (attachmentError) throw attachmentError;

    for (const attachment of attachments || []) {
      await removeCampaignAttachmentFromStorage(attachment.storage_path, attachment.storage_bucket || undefined);
      removedFiles += 1;
    }

    await db.from("signup_order_attachments").update({ is_active: false }).eq("order_id", order.id);
    await db
      .from("signup_orders")
      .update({
        status: "cancelled",
        payment_error: `Automatycznie wyczyszczono nieopłacone zamówienie po ${cutoffHours()}h.`,
        smtp_pass_encrypted: null,
        smtp_pass_iv: null,
        smtp_pass_auth_tag: null,
        smtp_pass_last4: null,
        smtp_pass_provided: false,
      })
      .eq("id", order.id);

    await db.from("audit_logs").insert({
      actor_email: "system",
      action: "cleanup_abandoned_signup_order",
      resource: "signup_orders",
      resource_id: order.id,
      details: { cutoff, removed_files: attachments?.length || 0 },
    });
    cleaned += 1;
  }

  return { cleaned, removedFiles, cutoff };
}

async function handleCron(request: Request) {
  if (!authorized(request)) return jsonError("Brak dostępu do crona cleanup-orders.", 401);
  try {
    return NextResponse.json({ ok: true, ...(await cleanupAbandonedOrders()) }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Błąd czyszczenia porzuconych zamówień.", 500);
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
