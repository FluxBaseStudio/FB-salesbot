import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeSessionLike = {
  id: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
  customer?: string | null | object;
  subscription?: string | null | object;
};

type StripeSubscriptionLike = {
  id: string;
  metadata?: Record<string, string> | null;
  customer?: string | null | object;
  status?: string | null;
  cancel_at_period_end?: boolean | null;
};

type StripeInvoiceLike = {
  subscription?: string | null | object;
  parent?: {
    subscription_details?: {
      subscription?: string | null;
    };
  };
};

type StripeEventLike = {
  type: string;
  data: {
    object: unknown;
  };
};

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getSubscriptionIdFromInvoice(invoice: StripeInvoiceLike) {
  const directSubscription = getStringValue(invoice.subscription);
  if (directSubscription) return directSubscription;

  const nestedSubscription = invoice.parent?.subscription_details?.subscription;
  return typeof nestedSubscription === "string" ? nestedSubscription : null;
}

async function updateClientBySubscription(subscriptionId: string, payload: Record<string, unknown>) {
  await adminDb().from("client_accounts").update(payload).eq("stripe_subscription_id", subscriptionId);
}

async function updateOrderFromSession(session: StripeSessionLike) {
  const orderId = session.client_reference_id || session.metadata?.order_id;
  if (!orderId) return;

  const isPaid = session.payment_status === "paid";

  await adminDb()
    .from("signup_orders")
    .update({
      status: isPaid ? "paid" : "pending_payment",
      stripe_checkout_session_id: session.id,
      stripe_customer_id: getStringValue(session.customer),
      stripe_subscription_id: getStringValue(session.subscription),
      stripe_payment_status: session.payment_status || null,
      paid_at: isPaid ? new Date().toISOString() : null,
      payment_error: null,
    })
    .eq("id", orderId);

  const subscriptionId = getStringValue(session.subscription);
  if (subscriptionId) {
    await updateClientBySubscription(subscriptionId, {
      subscription_status: isPaid ? "active" : "paused",
      stripe_customer_id: getStringValue(session.customer),
      stripe_subscription_id: subscriptionId,
    });
  }
}

async function updateOrderFromSubscription(subscription: StripeSubscriptionLike, status: "paid" | "payment_failed" | "cancelled") {
  const orderId = subscription.metadata?.order_id;
  const subscriptionId = subscription.id;
  const customerId = getStringValue(subscription.customer);

  const orderPayload = {
    status,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    stripe_payment_status: subscription.status || status,
    payment_error: status === "payment_failed" ? "Subscription payment failed or subscription is not active." : null,
  };

  if (orderId) {
    await adminDb().from("signup_orders").update(orderPayload).eq("id", orderId);
  } else {
    await adminDb().from("signup_orders").update(orderPayload).eq("stripe_subscription_id", subscriptionId);
  }

  const clientPayload = {
    subscription_status: status === "paid" ? "active" : status === "payment_failed" ? "paused" : "cancelled",
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  };
  await updateClientBySubscription(subscriptionId, clientPayload);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Brakuje STRIPE_WEBHOOK_SECRET." }, { status: 500 });
  }

  const rawBody = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Brak stripe-signature." }, { status: 400 });
  }

  let event: StripeEventLike;

  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret) as StripeEventLike;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Niepoprawny webhook Stripe.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await updateOrderFromSession(event.data.object as StripeSessionLike);
    }

    if (event.type === "invoice.paid") {
      const subscriptionId = getSubscriptionIdFromInvoice(event.data.object as StripeInvoiceLike);
      if (subscriptionId) {
        const subscription = (await getStripe().subscriptions.retrieve(subscriptionId)) as StripeSubscriptionLike;
        await updateOrderFromSubscription(subscription, "paid");
      }
    }

    if (event.type === "invoice.payment_failed") {
      const subscriptionId = getSubscriptionIdFromInvoice(event.data.object as StripeInvoiceLike);
      if (subscriptionId) {
        const subscription = (await getStripe().subscriptions.retrieve(subscriptionId)) as StripeSubscriptionLike;
        await updateOrderFromSubscription(subscription, "payment_failed");
      }
    }

    if (event.type === "customer.subscription.deleted") {
      await updateOrderFromSubscription(event.data.object as StripeSubscriptionLike, "cancelled");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook handler failed", error);
    return NextResponse.json({ error: "Webhook obsłużony z błędem." }, { status: 500 });
  }
}
