import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CLIENT_PORTAL_COOKIE, getPortalClientFromCookie } from "@/lib/clientPortalAuth";
import { adminDb } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const portalClient = await getPortalClientFromCookie(cookieStore.get(CLIENT_PORTAL_COOKIE)?.value);
  if (!portalClient) return jsonError("Brak sesji klienta.", 401);

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : null;
  const db = adminDb();
  const now = new Date().toISOString();

  const { data: fullClient, error: clientReadError } = await db
    .from("client_accounts")
    .select("id,stripe_subscription_id")
    .eq("id", portalClient.id)
    .single();
  if (clientReadError) return jsonError(clientReadError.message, 500);

  let stripeCancelError: string | null = null;
  if (fullClient?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.update(fullClient.stripe_subscription_id, { cancel_at_period_end: true });
    } catch (error) {
      stripeCancelError = error instanceof Error ? error.message : "Nie udało się ustawić anulowania w Stripe.";
    }
  }

  const cancelReason = [reason, stripeCancelError ? `Stripe: ${stripeCancelError}` : null].filter(Boolean).join("\n") || null;

  const [clientUpdate, campaignUpdate, auditLog] = await Promise.all([
    db.from("client_accounts").update({
      subscription_status: "cancel_requested",
      cancel_requested_at: now,
      cancel_reason: cancelReason,
    }).eq("id", portalClient.id),
    db.from("campaigns").update({ status: "paused", auto_run_enabled: false, auto_send_enabled: false }).eq("client_id", portalClient.id),
    db.from("audit_logs").insert({
      actor_email: portalClient.portal_email || portalClient.contact_email || "client-portal",
      action: "client_cancel_requested",
      resource: "client_accounts",
      resource_id: portalClient.id,
      details: { reason, stripe_subscription_id: fullClient?.stripe_subscription_id || null, stripe_cancel_error: stripeCancelError },
    }),
  ]);

  const error = clientUpdate.error || campaignUpdate.error || auditLog.error;
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true, stripeCancelError }, { headers: { "Cache-Control": "no-store" } });
}
