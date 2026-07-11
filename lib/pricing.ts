export type PackageScope = "poland" | "europe" | "voivodeship" | "custom";
export type BillingMode = "subscription" | "payment";

export const ADDITIONAL_MAILBOX_DAILY_EMAILS = 40;
export const ADDITIONAL_MAILBOX_PRICE_PLN = 1500;

export const VAT_RATE = 0.23;
export const VAT_MULTIPLIER = 1 + VAT_RATE;

export function grossAmountGrosze(netAmountPln: number) {
  return Math.round(netAmountPln * VAT_MULTIPLIER * 100);
}

export function formatGrossPriceFromNet(netAmountPln: number) {
  return `${(grossAmountGrosze(netAmountPln) / 100).toFixed(2).replace(".", ",")} zł brutto`;
}

export type BotSellerPlan = {
  id: string;
  name: string;
  dailyEmails: number;
  monthlyEmails: number;
  scope: PackageScope;
  pricePln: number;
  lookupKey: string;
  stripeMetadata: Record<string, string>;
  recommended?: boolean;
  billingMode: BillingMode;
  durationDays?: number;
  totalEmails?: number;
};

export const BOTSELLER_PLANS: BotSellerPlan[] = [
  {
    id: "trial-5-days",
    name: "Wersja próbna",
    dailyEmails: 20,
    monthlyEmails: 100,
    scope: "poland",
    pricePln: 250,
    lookupKey: "botseller_trial_5_days",
    stripeMetadata: { plan_id: "trial-5-days", scope: "poland", daily_emails: "20", total_emails: "100", duration_days: "5" },
    billingMode: "payment",
    durationDays: 5,
    totalEmails: 100,
  },
  {
    id: "starter",
    name: "Starter",
    dailyEmails: 20,
    monthlyEmails: 600,
    scope: "poland",
    pricePln: 999,
    lookupKey: "botseller_starter_monthly",
    stripeMetadata: { plan_id: "starter", scope: "poland", daily_emails: "20", monthly_emails: "600" },
    billingMode: "subscription",
  },
  {
    id: "growth",
    name: "Growth",
    dailyEmails: 40,
    monthlyEmails: 1200,
    scope: "poland",
    pricePln: 1999,
    lookupKey: "botseller_growth_monthly",
    stripeMetadata: { plan_id: "growth", scope: "poland", daily_emails: "40", monthly_emails: "1200" },
    recommended: true,
    billingMode: "subscription",
  },
  {
    id: "pro",
    name: "Pro",
    dailyEmails: 80,
    monthlyEmails: 2400,
    scope: "poland",
    pricePln: 3999,
    lookupKey: "botseller_pro_monthly",
    stripeMetadata: { plan_id: "pro", scope: "poland", daily_emails: "80", monthly_emails: "2400" },
    billingMode: "subscription",
  },
];

const legacyPlanAliases: Record<string, string> = {
  "poland-starter": "starter",
  "poland-growth": "growth",
  "poland-pro": "pro",
  "europe-scale": "pro",
};

export function getPlan(planId: string) {
  const normalizedPlanId = legacyPlanAliases[planId] || planId;
  return BOTSELLER_PLANS.find((plan) => plan.id === normalizedPlanId) || BOTSELLER_PLANS[1];
}

export function formatPlanPrice(plan: BotSellerPlan) {
  return plan.billingMode === "payment"
    ? `${plan.pricePln} zł netto / ${plan.durationDays || 5} dni`
    : `${plan.pricePln} zł netto / mies.`;
}
