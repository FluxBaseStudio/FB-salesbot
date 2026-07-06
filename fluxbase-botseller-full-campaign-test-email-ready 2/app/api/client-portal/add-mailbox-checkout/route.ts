import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CLIENT_PORTAL_COOKIE, getPortalClientFromCookie } from "@/lib/clientPortalAuth";
import { getBaseUrl, getStripe } from "@/lib/stripe/server";
import { ADDITIONAL_MAILBOX_DAILY_EMAILS, ADDITIONAL_MAILBOX_PRICE_PLN } from "@/lib/pricing";
import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const portalClient = await getPortalClientFromCookie(cookieStore.get(CLIENT_PORTAL_COOKIE)?.value);
    if (!portalClient) return jsonError("Brak sesji klienta.", 401);

    const priceId = process.env.STRIPE_PRICE_ADDITIONAL_MAILBOX || process.env.STRIPE_PRICE_MAILBOX || process.env.STRIPE_PRICE_EXTRA_MAILBOX || process.env.STRIPE_ADDITIONAL_MAILBOX_PRICE_ID || "";
    if (!priceId) return jsonError("Brakuje STRIPE_PRICE_ADDITIONAL_MAILBOX dla dodatkowej skrzynki 1500 zł netto.", 500);

    const { data: client, error } = await adminDb()
      .from("client_accounts")
      .select("id,company_name,contact_email,stripe_customer_id")
      .eq("id", portalClient.id)
      .single();
    if (error) throw error;

    const baseUrl = getBaseUrl();
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: client.stripe_customer_id || undefined,
      customer_email: client.stripe_customer_id ? undefined : client.contact_email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/client?addon=mailbox-success`,
      cancel_url: `${baseUrl}/client?addon=mailbox-cancelled`,
      metadata: {
        client_id: client.id,
        addon: "additional_mailbox",
        daily_emails: String(ADDITIONAL_MAILBOX_DAILY_EMAILS),
        monthly_price_pln: String(ADDITIONAL_MAILBOX_PRICE_PLN),
      },
      subscription_data: {
        metadata: {
          client_id: client.id,
          addon: "additional_mailbox",
          daily_emails: String(ADDITIONAL_MAILBOX_DAILY_EMAILS),
          monthly_price_pln: String(ADDITIONAL_MAILBOX_PRICE_PLN),
        },
      },
    });

    await adminDb().from("audit_logs").insert({
      actor_email: portalClient.portal_email || portalClient.contact_email || "client-portal",
      action: "client_additional_mailbox_checkout_started",
      resource: "client_accounts",
      resource_id: client.id,
      details: { stripe_session_id: session.id, price_id: priceId },
    });

    return NextResponse.json({ ok: true, url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się utworzyć płatności za dodatkową skrzynkę.";
    console.error("additional mailbox checkout failed", error);
    return jsonError(message, 500);
  }
}
