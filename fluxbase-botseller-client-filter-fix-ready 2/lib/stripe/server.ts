import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("Brakuje STRIPE_SECRET_KEY w .env.local.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }

  return stripeClient;
}

export function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (baseUrl) {
    return baseUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    return `https://${vercelUrl}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
