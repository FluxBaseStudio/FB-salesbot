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
};

export const BOTSELLER_PLANS: BotSellerPlan[] = [
  {
    id: "poland-starter",
    name: "Polska Starter",
    dailyEmails: 20,
    monthlyEmails: 600,
    scope: "poland",
    pricePln: 799,
    stripePriceIdEnv: "STRIPE_PRICE_POLAND_STARTER",
    stripePriceIdEnvFallbacks: ["STRIPE_PRICE_STARTER", "STRIPE_STARTER_PRICE_ID", "STRIPE_PRICE_BOTSELLER_STARTER"],
    lookupKey: "botseller_poland_starter_monthly",
    stripeMetadata: { plan_id: "poland-starter", scope: "poland", daily_emails: "20", monthly_emails: "600" },
  },
  {
    id: "poland-growth",
    name: "Polska Growth",
    dailyEmails: 30,
    monthlyEmails: 900,
    scope: "poland",
    pricePln: 1199,
    stripePriceIdEnv: "STRIPE_PRICE_POLAND_GROWTH",
    stripePriceIdEnvFallbacks: ["STRIPE_PRICE_GROWTH", "STRIPE_GROWTH_PRICE_ID", "STRIPE_PRICE_BOTSELLER_GROWTH"],
    lookupKey: "botseller_poland_growth_monthly",
    stripeMetadata: { plan_id: "poland-growth", scope: "poland", daily_emails: "30", monthly_emails: "900" },
    recommended: true,
  },
  {
    id: "poland-pro",
    name: "Polska Pro",
    dailyEmails: 40,
    monthlyEmails: 1200,
    scope: "poland",
    pricePln: 1599,
    stripePriceIdEnv: "STRIPE_PRICE_POLAND_PRO",
    stripePriceIdEnvFallbacks: ["STRIPE_PRICE_PRO", "STRIPE_PRO_PRICE_ID", "STRIPE_PRICE_BOTSELLER_PRO"],
    lookupKey: "botseller_poland_pro_monthly",
    stripeMetadata: { plan_id: "poland-pro", scope: "poland", daily_emails: "40", monthly_emails: "1200" },
  },
  {
    id: "europe-scale",
    name: "Europe Scale",
    dailyEmails: 50,
    monthlyEmails: 1500,
    scope: "europe",
    pricePln: 2399,
    stripePriceIdEnv: "STRIPE_PRICE_EUROPE_SCALE",
    stripePriceIdEnvFallbacks: ["STRIPE_PRICE_EUROPE", "STRIPE_PRICE_SCALE", "STRIPE_EUROPE_SCALE_PRICE_ID", "STRIPE_PRICE_BOTSELLER_EUROPE"],
    lookupKey: "botseller_europe_scale_monthly",
    stripeMetadata: { plan_id: "europe-scale", scope: "europe", daily_emails: "50", monthly_emails: "1500" },
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
  return `${plan.pricePln} zł / mies.`;
}
