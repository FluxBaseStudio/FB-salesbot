export type PackageScope = "poland" | "europe" | "voivodeship" | "custom";

export type BotSellerPlan = {
  id: string;
  name: string;
  dailyEmails: number;
  monthlyEmails: number;
  scope: PackageScope;
  pricePln: number;
  stripePriceIdEnv: string;
  stripePriceIdEnvFallbacks?: string[];
  lookupKey: string;
  stripeMetadata: Record<string, string>;
  recommended?: boolean;
  billingType: "one_time" | "subscription";
  billingLabel: string;
  priceLabel: string;
  shortDescription: string;
};

export const ADDITIONAL_MAILBOX_DAILY_EMAILS = 40;
export const ADDITIONAL_MAILBOX_PRICE_PLN = 1500;

export const BOTSELLER_PLANS: BotSellerPlan[] = [
  {
    id: "trial-5-days",
    name: "Wersja próbna",
    dailyEmails: 20,
    monthlyEmails: 100,
    scope: "poland",
    pricePln: 250,
    stripePriceIdEnv: "STRIPE_PRICE_TRIAL_5_DAYS",
    stripePriceIdEnvFallbacks: ["STRIPE_PRICE_TRIAL", "STRIPE_TRIAL_PRICE_ID", "STRIPE_PRICE_BOTSELLER_TRIAL"],
    lookupKey: "botseller_trial_5_days",
    stripeMetadata: { plan_id: "trial-5-days", scope: "poland", daily_emails: "20", total_emails: "100", duration_days: "5" },
    billingType: "one_time",
    billingLabel: "5 dni",
    priceLabel: "250 zł netto / 5 dni",
    shortDescription: "Test systemu przez 5 dni: 20 maili dziennie, 100 wiadomości łącznie.",
  },
  {
    id: "starter",
    name: "Starter",
    dailyEmails: 20,
    monthlyEmails: 600,
    scope: "poland",
    pricePln: 999,
    stripePriceIdEnv: "STRIPE_PRICE_STARTER",
    stripePriceIdEnvFallbacks: ["STRIPE_PRICE_POLAND_STARTER", "STRIPE_STARTER_PRICE_ID", "STRIPE_PRICE_BOTSELLER_STARTER"],
    lookupKey: "botseller_starter_monthly",
    stripeMetadata: { plan_id: "starter", scope: "poland", daily_emails: "20", monthly_emails: "600" },
    billingType: "subscription",
    billingLabel: "miesiąc",
    priceLabel: "999 zł netto / mies.",
    shortDescription: "Dla małych firm, które chcą uruchomić stały kanał pozyskiwania klientów.",
  },
  {
    id: "growth",
    name: "Growth",
    dailyEmails: 40,
    monthlyEmails: 1200,
    scope: "poland",
    pricePln: 1999,
    stripePriceIdEnv: "STRIPE_PRICE_GROWTH",
    stripePriceIdEnvFallbacks: ["STRIPE_PRICE_POLAND_GROWTH", "STRIPE_GROWTH_PRICE_ID", "STRIPE_PRICE_BOTSELLER_GROWTH"],
    lookupKey: "botseller_growth_monthly",
    stripeMetadata: { plan_id: "growth", scope: "poland", daily_emails: "40", monthly_emails: "1200" },
    recommended: true,
    billingType: "subscription",
    billingLabel: "miesiąc",
    priceLabel: "1 999 zł netto / mies.",
    shortDescription: "Najlepszy wybór dla firm, które chcą regularnie testować targety i skalować sprzedaż.",
  },
  {
    id: "pro",
    name: "Pro",
    dailyEmails: 80,
    monthlyEmails: 2400,
    scope: "poland",
    pricePln: 3999,
    stripePriceIdEnv: "STRIPE_PRICE_PRO",
    stripePriceIdEnvFallbacks: ["STRIPE_PRICE_POLAND_PRO", "STRIPE_PRO_PRICE_ID", "STRIPE_PRICE_BOTSELLER_PRO"],
    lookupKey: "botseller_pro_monthly",
    stripeMetadata: { plan_id: "pro", scope: "poland", daily_emails: "80", monthly_emails: "2400" },
    billingType: "subscription",
    billingLabel: "miesiąc",
    priceLabel: "3 999 zł netto / mies.",
    shortDescription: "Dla firm, które chcą mocniej skalować działania sprzedażowe i prowadzić intensywniejsze kampanie.",
  },
];

export function getPlan(planId: string) {
  return BOTSELLER_PLANS.find((plan) => plan.id === planId) || BOTSELLER_PLANS[0];
}

export function getStripePriceId(planId: string) {
  const plan = getPlan(planId);
  const envNames = [plan.stripePriceIdEnv, ...(plan.stripePriceIdEnvFallbacks || [])];
  for (const envName of envNames) {
    const value = process.env[envName];
    if (value) return value;
  }
  return "";
}

export function getStripePriceEnvNames(planId: string) {
  const plan = getPlan(planId);
  return [plan.stripePriceIdEnv, ...(plan.stripePriceIdEnvFallbacks || [])];
}

export function formatPlanPrice(plan: BotSellerPlan) {
  return plan.priceLabel;
}
