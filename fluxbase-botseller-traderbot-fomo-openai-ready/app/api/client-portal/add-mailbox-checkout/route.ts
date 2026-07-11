import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CLIENT_PORTAL_COOKIE, getPortalClientFromCookie } from "@/lib/clientPortalAuth";
import { getBaseUrl, getStripe } from "@/lib/stripe/server";
import { ADDITIONAL_MAILBOX_DAILY_EMAILS, ADDITIONAL_MAILBOX_PRICE_PLN, grossAmountGrosze } from "@/lib/pricing";
import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function additionalMailboxLineItem() {
  return {
    price_data: {
      currency: "pln",
      unit_amount: grossAmountGrosze(ADDITIONAL_MAILBOX_PRICE_PLN),
      product_data: {
        name: "FluxBase BotSeller - Dodatkowa skrzynka / bot",
        description: `+${ADDITIONAL_MAILBOX_DAILY_EMAILS} maili dziennie`,
        metadata: {
          addon: "additional_mailbox",
          lookup_key: "botseller_additional_mailbox_monthly",
          daily_emails: String(ADDITIONAL_MAILBOX_DAILY_EMAILS),
          price_pln_netto: String(ADDITIONAL_MAILBOX_PRICE_PLN),
          price_pln_brutto: String((grossAmountGrosze(ADDITIONAL_MAILBOX_PRICE_PLN) / 100).toFixed(2)),
          vat_rate: "23",
        },
      },
      recurring: { interval: "month" as const },
      tax_behavior: "inclusive" as const,
    },
    quantity: 1,
  };
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const portalClient = await getPortalClientFromCookie(cookieStore.get(CLIENT_PORTAL_COOKIE)?.value);
    if (!portalClient) return jsonError("Brak sesji klienta.", 401);

    const inlinePriceReference = `inline:additional_mailbox:${ADDITIONAL_MAILBOX_PRICE_PLN}:pln_netto:${grossAmountGrosze(ADDITIONAL_MAILBOX_PRICE_PLN) / 100}:pln_brutto:subscription`;

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
      line_items: [additionalMailboxLineItem() as any],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/client?addon=mailbox-success`,
      cancel_url: `${baseUrl}/client?addon=mailbox-cancelled`,
      metadata: {
        client_id: client.id,
        addon: "additional_mailbox",
        daily_emails: "40",
        monthly_price_pln: "1500",
      },
      subscription_data: {
        metadata: {
          client_id: client.id,
          addon: "additional_mailbox",
          daily_emails: "40",
          monthly_price_pln: "1500",
        },
      },
    });

    await adminDb().from("audit_logs").insert({
      actor_email: portalClient.portal_email || portalClient.contact_email || "client-portal",
      action: "client_additional_mailbox_checkout_started",
      resource: "client_accounts",
      resource_id: client.id,
      details: { stripe_session_id: session.id, price_id: inlinePriceReference },
    });

    return NextResponse.json({ ok: true, url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się utworzyć płatności za dodatkową skrzynkę.";
    console.error("additional mailbox checkout failed", error);
    return jsonError(message, 500);
  }
}
