import "server-only";

import crypto from "crypto";

import { encryptSecret } from "@/lib/cryptoSecrets";
import { hashPortalPassword } from "@/lib/clientPortalAuth";
import { getPlan, type BotSellerPlan } from "@/lib/pricing";
import { adminDb } from "@/lib/supabaseAdmin";
import { EUROPE_COUNTRY_NAMES_FOR_EUROPE_PLAN, VOIVODESHIP_NAMES, type LocationScope } from "@/lib/locationOptions";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedLocationScopes = new Set(["poland", "europe", "europe_countries", "voivodeship", "custom"]);

function scopeForPlan(plan: BotSellerPlan, rawScope: string): LocationScope {
  if (plan.scope === "europe") {
    return rawScope === "europe_countries" ? "europe_countries" : "europe";
  }
  return rawScope === "voivodeship" ? "voivodeship" : "poland";
}

function locationsForPlanScope(plan: BotSellerPlan, scope: LocationScope, selected: string[]) {
  if (scope === "poland") return ["Cała Polska"];
  if (scope === "europe") return ["Cała Europa"];
  if (scope === "europe_countries") {
    const allowed = new Set(EUROPE_COUNTRY_NAMES_FOR_EUROPE_PLAN);
    return selected.filter((item) => allowed.has(item));
  }
  if (scope === "voivodeship") {
    const allowed = new Set(VOIVODESHIP_NAMES);
    return selected.filter((item) => allowed.has(item));
  }
  return plan.scope === "europe" ? ["Cała Europa"] : ["Cała Polska"];
}


type RecordLike = Record<string, unknown>;

export type SignupOrderInput = {
  company_name: string;
  nip: string | null;
  contact_name: string | null;
  contact_email: string;
  phone: string | null;
  website: string | null;
  wants_vat_invoice: boolean;
  invoice_details: string | null;
  plan: BotSellerPlan;
  location_scope: LocationScope;
  selected_locations: string[];
  target_industries: string[];
  company_description: string;
  promoted_service: string;
  value_proposition: string | null;
  target_customer_description: string | null;
  target_audience_niche: string | null;
  decision_maker_roles: string | null;
  target_business_model: string | null;
  target_company_stage: string | null;
  target_price_segment: string | null;
  exact_target_business_type: string | null;
  target_business_activities: string | null;
  target_company_size: string | null;
  required_online_signals: string | null;
  lead_qualification_rules: string | null;
  lead_disqualification_rules: string | null;
  sample_email_style: string | null;
  must_have_signals: string | null;
  excluded_company_types: string | null;
  search_keywords: string | null;
  negative_keywords: string | null;
  preferred_lead_profile: string | null;
  customer_pain_points: string | null;
  avoid_in_messages: string | null;
  call_to_action: string | null;
  tone: string | null;
  bot_first_name: string | null;
  bot_last_name: string | null;
  bot_role: string | null;
  signature_company: string | null;
  signature_website: string | null;
  signature_email: string | null;
  signature_phone: string | null;
  signature_address: string | null;
  signature_footer_note: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_from: string | null;
  smtp_reply_to: string;
  smtp_pass: string | null;
  mailbox_setup_mode: string;
  desired_mailbox_local_part: string | null;
  reply_destination_email: string | null;
  additional_mailbox_requested: boolean;
  additional_mailbox_price_pln: number;
  additional_mailbox_daily_emails: number;
  total_daily_emails: number;
  onboarding_step?: number;
  onboarding_step_label?: string | null;
  onboarding_completed?: boolean;
};

export type SignupOrderValidation =
  | { ok: true; data: SignupOrderInput }
  | { ok: false; errors: string[] };

export const SIGNUP_ORDER_SAFE_SELECT = [
  "id",
  "company_name",
  "nip",
  "contact_name",
  "contact_email",
  "phone",
  "website",
  "wants_vat_invoice",
  "invoice_details",
  "plan_id",
  "plan_name",
  "plan_price_pln",
  "daily_emails",
  "monthly_emails",
  "location_scope",
  "selected_locations",
  "target_industries",
  "company_description",
  "promoted_service",
  "value_proposition",
  "target_customer_description",
  "target_audience_niche",
  "decision_maker_roles",
  "target_business_model",
  "target_company_stage",
  "target_price_segment",
  "exact_target_business_type",
  "target_business_activities",
  "target_company_size",
  "required_online_signals",
  "lead_qualification_rules",
  "lead_disqualification_rules",
  "sample_email_style",
  "must_have_signals",
  "excluded_company_types",
  "search_keywords",
  "negative_keywords",
  "preferred_lead_profile",
  "customer_pain_points",
  "avoid_in_messages",
  "call_to_action",
  "tone",
  "bot_first_name",
  "bot_last_name",
  "bot_role",
  "signature_company",
  "signature_website",
  "signature_email",
  "signature_phone",
  "signature_address",
  "signature_footer_note",
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_user",
  "smtp_from",
  "smtp_reply_to",
  "smtp_pass_last4",
  "smtp_pass_provided",
  "mailbox_setup_mode",
  "desired_mailbox_local_part",
  "reply_destination_email",
  "additional_mailbox_requested",
  "additional_mailbox_price_pln",
  "additional_mailbox_daily_emails",
  "total_daily_emails",
  "onboarding_step",
  "onboarding_step_label",
  "onboarding_completed",
  "updated_at",
  "stripe_checkout_session_id",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_payment_status",
  "stripe_price_id",
  "stripe_product_id",
  "accepts_terms",
  "accepts_recurring_contract",
  "terms_accepted_at",
  "recurring_contract_accepted_at",
  "consent_ip",
  "consent_user_agent",
  "paid_at",
  "payment_error",
  "converted_client_id",
  "converted_campaign_id",
  "converted_at",
  "status",
  "created_at",
].join(",");

function asRecord(value: unknown): RecordLike {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordLike) : {};
}

function text(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function optionalText(value: unknown) {
  const next = text(value);
  return next ? next : null;
}

function list(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return text(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  const next = text(value).toLowerCase();
  if (["true", "1", "yes", "on", "tak"].includes(next)) return true;
  if (["false", "0", "no", "off", "nie"].includes(next)) return false;
  return fallback;
}

function int(value: unknown, fallback: number) {
  const parsed = Number(text(value));
  return Number.isInteger(parsed) ? parsed : fallback;
}

function normalizedWebsite(value: unknown, errors: string[]) {
  const raw = text(value);
  const lowered = raw.toLowerCase();
  const noWebsiteValues = new Set(["-", "–", "—", "−", "brak", "brak strony", "nie mam", "nie ma", "none", "no website", "no site"]);

  // Strona www jest opcjonalna. Klient może zostawić puste pole albo wpisać "-",
  // jeżeli firma nie ma strony internetowej. W takim przypadku nie blokujemy formularza.
  if (!raw || noWebsiteValues.has(lowered)) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname.includes(".")) throw new Error("Invalid hostname");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    // To pole nie może blokować płatności. Jeśli wpis nie jest poprawnym URL-em,
    // zapisujemy go jako brak strony zamiast zatrzymywać klienta na formularzu.
    return null;
  }
}

function optionalEmail(value: unknown, label: string, errors: string[]) {
  const next = text(value).toLowerCase();
  if (!next) return null;
  if (!emailPattern.test(next)) {
    errors.push(`${label} ma niepoprawny format.`);
    return next;
  }
  return next;
}

function pushRequired(errors: string[], value: string, label: string) {
  if (!value) errors.push(`${label} jest wymagane.`);
}

export function validateSignupOrderPayload(value: unknown, options: { requireSmtpPass?: boolean } = {}): SignupOrderValidation {
  const input = asRecord(value);
  const errors: string[] = [];
  const plan = getPlan(text(input.plan_id));
  const companyName = text(input.company_name);
  const contactEmail = text(input.contact_email).toLowerCase();
  const locationScopeRaw = text(input.location_scope) || plan.scope;
  const locationScope = scopeForPlan(plan, allowedLocationScopes.has(locationScopeRaw) ? locationScopeRaw : plan.scope);
  const selectedLocations = locationsForPlanScope(plan, locationScope, list(input.selected_locations));
  const targetIndustries = list(input.target_industries);
  const companyDescription = text(input.company_description);
  const promotedService = text(input.promoted_service);
  const smtpHost = text(input.smtp_host) || "smtp.gmail.com";
  const smtpPort = int(input.smtp_port, 465);
  const smtpUser = text(input.smtp_user).toLowerCase();
  const smtpReplyTo = text(input.smtp_reply_to).toLowerCase() || contactEmail;
  const smtpPass = text(input.smtp_pass) || null;
  const mailboxSetupMode = text(input.mailbox_setup_mode) === "client_connects" ? "client_connects" : "fluxbase_setup";
  const desiredMailboxLocalPart = optionalText(input.desired_mailbox_local_part);
  const replyDestinationEmail = optionalEmail(input.reply_destination_email, "Główny email do odpowiedzi", errors) || smtpReplyTo || contactEmail;
  const additionalMailboxRequested = bool(input.additional_mailbox_requested);
  const additionalMailboxDailyEmails = additionalMailboxRequested ? 50 : 0;
  const additionalMailboxPricePln = additionalMailboxRequested ? 599 : 0;
  const totalDailyEmails = plan.dailyEmails + additionalMailboxDailyEmails;

  pushRequired(errors, companyName, "Nazwa firmy");
  if (!contactEmail || !emailPattern.test(contactEmail)) errors.push("Podaj poprawny email kontaktowy.");
  if (mailboxSetupMode === "client_connects") {
    if (smtpUser && !emailPattern.test(smtpUser)) errors.push("SMTP user powinien być poprawnym adresem email.");
    if (!smtpUser) errors.push("SMTP user jest wymagany, żeby klient wiedział, z jakiej skrzynki idzie wysyłka.");
    if (!smtpReplyTo || !emailPattern.test(smtpReplyTo)) errors.push("Reply-To musi być poprawnym adresem email.");
    if (!smtpHost) errors.push("SMTP host jest wymagany.");
    if (smtpPort < 1 || smtpPort > 65535) errors.push("SMTP port musi być od 1 do 65535.");
    if (options.requireSmtpPass && !smtpPass) errors.push("SMTP pass / hasło aplikacji jest wymagane przed płatnością.");
  } else if (!replyDestinationEmail || !emailPattern.test(replyDestinationEmail)) {
    errors.push("Podaj poprawny główny email, na który mają trafiać odpowiedzi.");
  }
  if (!targetIndustries.length) errors.push("Dodaj co najmniej jedną branżę targetu.");
  pushRequired(errors, companyDescription, "Opis firmy");
  pushRequired(errors, promotedService, "Promowana usługa");

  if ((locationScope === "voivodeship" || locationScope === "custom" || locationScope === "europe_countries") && !selectedLocations.length) {
    errors.push(locationScope === "voivodeship" ? "Wybierz co najmniej jedno województwo." : locationScope === "europe_countries" ? "Wybierz co najmniej jeden kraj europejski." : "Wpisz co najmniej jedno miasto.");
  }


  const website = normalizedWebsite(input.website, errors);

  const data: SignupOrderInput = {
    company_name: companyName,
    nip: optionalText(input.nip),
    contact_name: optionalText(input.contact_name),
    contact_email: contactEmail,
    phone: optionalText(input.phone),
    website,
    wants_vat_invoice: bool(input.wants_vat_invoice),
    invoice_details: optionalText(input.invoice_details),
    plan,
    location_scope: locationScope,
    selected_locations: selectedLocations,
    target_industries: targetIndustries,
    company_description: companyDescription,
    promoted_service: promotedService,
    value_proposition: optionalText(input.value_proposition),
    target_customer_description: optionalText(input.target_customer_description),
    target_audience_niche: optionalText(input.target_audience_niche),
    decision_maker_roles: optionalText(input.decision_maker_roles),
    target_business_model: optionalText(input.target_business_model),
    target_company_stage: optionalText(input.target_company_stage),
    target_price_segment: optionalText(input.target_price_segment),
    exact_target_business_type: optionalText(input.exact_target_business_type),
    target_business_activities: optionalText(input.target_business_activities),
    target_company_size: optionalText(input.target_company_size),
    required_online_signals: optionalText(input.required_online_signals),
    lead_qualification_rules: optionalText(input.lead_qualification_rules),
    lead_disqualification_rules: optionalText(input.lead_disqualification_rules),
    sample_email_style: optionalText(input.sample_email_style),
    must_have_signals: optionalText(input.must_have_signals),
    excluded_company_types: optionalText(input.excluded_company_types),
    search_keywords: optionalText(input.search_keywords),
    negative_keywords: optionalText(input.negative_keywords),
    preferred_lead_profile: optionalText(input.preferred_lead_profile),
    customer_pain_points: optionalText(input.customer_pain_points),
    avoid_in_messages: optionalText(input.avoid_in_messages),
    call_to_action: optionalText(input.call_to_action),
    tone: optionalText(input.tone),
    bot_first_name: optionalText(input.bot_first_name),
    bot_last_name: optionalText(input.bot_last_name),
    bot_role: optionalText(input.bot_role),
    signature_company: optionalText(input.signature_company),
    signature_website: normalizedWebsite(input.signature_website, errors),
    signature_email: optionalEmail(input.signature_email, "Email w podpisie", errors),
    signature_phone: optionalText(input.signature_phone),
    signature_address: optionalText(input.signature_address),
    signature_footer_note: optionalText(input.signature_footer_note),
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_secure: bool(input.smtp_secure, smtpPort === 465),
    smtp_user: smtpUser,
    smtp_from: optionalText(input.smtp_from),
    smtp_reply_to: smtpReplyTo || replyDestinationEmail,
    smtp_pass: smtpPass,
    mailbox_setup_mode: mailboxSetupMode,
    desired_mailbox_local_part: desiredMailboxLocalPart,
    reply_destination_email: replyDestinationEmail,
    additional_mailbox_requested: additionalMailboxRequested,
    additional_mailbox_price_pln: additionalMailboxPricePln,
    additional_mailbox_daily_emails: additionalMailboxDailyEmails,
    total_daily_emails: totalDailyEmails,
  };

  return errors.length ? { ok: false, errors } : { ok: true, data };
}

export function signupOrderToInsertPayload(data: SignupOrderInput, status: "draft" | "pending" | "pending_payment") {
  const encrypted = data.smtp_pass ? encryptSecret(data.smtp_pass) : null;
  return {
    company_name: data.company_name,
    nip: data.nip,
    contact_name: data.contact_name,
    contact_email: data.contact_email,
    phone: data.phone,
    website: data.website,
    wants_vat_invoice: data.wants_vat_invoice,
    invoice_details: data.invoice_details,
    plan_id: data.plan.id,
    plan_name: data.plan.name,
    plan_price_pln: data.plan.pricePln,
    daily_emails: data.plan.dailyEmails,
    monthly_emails: data.plan.monthlyEmails,
    location_scope: data.location_scope,
    selected_locations: data.selected_locations,
    target_industries: data.target_industries,
    company_description: data.company_description,
    promoted_service: data.promoted_service,
    value_proposition: data.value_proposition,
    target_customer_description: data.target_customer_description,
    target_audience_niche: data.target_audience_niche,
    decision_maker_roles: data.decision_maker_roles,
    target_business_model: data.target_business_model,
    target_company_stage: data.target_company_stage,
    target_price_segment: data.target_price_segment,
    exact_target_business_type: data.exact_target_business_type,
    target_business_activities: data.target_business_activities,
    target_company_size: data.target_company_size,
    required_online_signals: data.required_online_signals,
    lead_qualification_rules: data.lead_qualification_rules,
    lead_disqualification_rules: data.lead_disqualification_rules,
    sample_email_style: data.sample_email_style,
    must_have_signals: data.must_have_signals,
    excluded_company_types: data.excluded_company_types,
    search_keywords: data.search_keywords,
    negative_keywords: data.negative_keywords,
    preferred_lead_profile: data.preferred_lead_profile,
    customer_pain_points: data.customer_pain_points,
    avoid_in_messages: data.avoid_in_messages,
    call_to_action: data.call_to_action,
    tone: data.tone,
    bot_first_name: data.bot_first_name,
    bot_last_name: data.bot_last_name,
    bot_role: data.bot_role,
    signature_company: data.signature_company,
    signature_website: data.signature_website,
    signature_email: data.signature_email,
    signature_phone: data.signature_phone,
    signature_address: data.signature_address,
    signature_footer_note: data.signature_footer_note,
    smtp_host: data.smtp_host,
    smtp_port: data.smtp_port,
    smtp_secure: data.smtp_secure,
    smtp_user: data.smtp_user,
    smtp_from: data.smtp_from,
    smtp_reply_to: data.smtp_reply_to,
    smtp_pass_encrypted: encrypted?.encrypted_value || null,
    smtp_pass_iv: encrypted?.iv || null,
    smtp_pass_auth_tag: encrypted?.auth_tag || null,
    smtp_pass_last4: encrypted?.value_last4 || null,
    smtp_pass_provided: Boolean(encrypted),
    mailbox_setup_mode: data.mailbox_setup_mode,
    desired_mailbox_local_part: data.desired_mailbox_local_part,
    reply_destination_email: data.reply_destination_email,
    additional_mailbox_requested: data.additional_mailbox_requested,
    additional_mailbox_price_pln: data.additional_mailbox_price_pln,
    additional_mailbox_daily_emails: data.additional_mailbox_daily_emails,
    total_daily_emails: data.total_daily_emails,
    onboarding_completed: status === "pending_payment",
    status,
  };
}


const allowedOrderStatuses = new Set(["draft", "pending", "pending_payment", "paid", "payment_failed", "converted", "rejected", "cancelled"]);

function numberValue(value: unknown, fallback: number | null, errors: string[], label: string, min = 0, max = 1000000) {
  const raw = text(value);
  if (!raw) return fallback;
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    errors.push(`${label} ma niepoprawną wartość.`);
    return fallback;
  }
  return parsed;
}

function integerValue(value: unknown, fallback: number | null, errors: string[], label: string, min = 0, max = 1000000) {
  const raw = text(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    errors.push(`${label} musi być liczbą całkowitą.`);
    return fallback;
  }
  return parsed;
}

function optionalDate(value: unknown, errors: string[], label: string) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${label} ma niepoprawny format daty.`);
    return raw;
  }
  return parsed.toISOString();
}

export function signupOrderToUpdatePayload(value: unknown) {
  const input = asRecord(value);
  const errors: string[] = [];
  const plan = getPlan(text(input.plan_id));
  const companyName = text(input.company_name);
  const contactEmail = text(input.contact_email).toLowerCase();
  const locationScopeRaw = text(input.location_scope) || plan.scope;
  const locationScope = scopeForPlan(plan, allowedLocationScopes.has(locationScopeRaw) ? locationScopeRaw : plan.scope);
  const selectedLocations = locationsForPlanScope(plan, locationScope, list(input.selected_locations));
  const targetIndustries = list(input.target_industries);
  const companyDescription = text(input.company_description);
  const promotedService = text(input.promoted_service);
  const smtpHost = text(input.smtp_host) || "smtp.gmail.com";
  const smtpPort = int(input.smtp_port, 465);
  const smtpUser = text(input.smtp_user).toLowerCase();
  const smtpReplyTo = text(input.smtp_reply_to).toLowerCase() || contactEmail;
  const status = text(input.status) || "pending";
  const mailboxSetupMode = text(input.mailbox_setup_mode) === "client_connects" ? "client_connects" : "fluxbase_setup";
  const desiredMailboxLocalPart = optionalText(input.desired_mailbox_local_part);
  const replyDestinationEmail = optionalEmail(input.reply_destination_email, "Główny email do odpowiedzi", errors) || smtpReplyTo || contactEmail;
  const additionalMailboxRequested = bool(input.additional_mailbox_requested);
  const additionalMailboxDailyEmails = integerValue(input.additional_mailbox_daily_emails, additionalMailboxRequested ? 50 : 0, errors, "Dodatkowy limit skrzynki", 0, 500) || 0;
  const additionalMailboxPricePln = integerValue(input.additional_mailbox_price_pln, additionalMailboxRequested ? 599 : 0, errors, "Cena dodatkowej skrzynki", 0, 1000000) || 0;
  const totalDailyEmails = integerValue(input.total_daily_emails, (plan.dailyEmails || 0) + additionalMailboxDailyEmails, errors, "Łączny limit dzienny", 0, 1000000) || ((plan.dailyEmails || 0) + additionalMailboxDailyEmails);

  pushRequired(errors, companyName, "Nazwa firmy");
  if (!contactEmail || !emailPattern.test(contactEmail)) errors.push("Podaj poprawny email kontaktowy.");
  if (mailboxSetupMode === "client_connects") {
    if (smtpUser && !emailPattern.test(smtpUser)) errors.push("SMTP user powinien być poprawnym adresem email.");
    if (!smtpUser) errors.push("SMTP user jest wymagany.");
    if (!smtpReplyTo || !emailPattern.test(smtpReplyTo)) errors.push("Reply-To musi być poprawnym adresem email.");
    if (smtpPort < 1 || smtpPort > 65535) errors.push("SMTP port musi być od 1 do 65535.");
  }
  if (!targetIndustries.length) errors.push("Dodaj co najmniej jedną branżę targetu.");
  pushRequired(errors, companyDescription, "Opis firmy");
  pushRequired(errors, promotedService, "Promowana usługa");
  if (!allowedOrderStatuses.has(status)) errors.push("Status zamówienia jest nieprawidłowy.");

  if ((locationScope === "voivodeship" || locationScope === "custom" || locationScope === "europe_countries") && !selectedLocations.length) {
    errors.push(locationScope === "voivodeship" ? "Wybierz co najmniej jedno województwo." : locationScope === "europe_countries" ? "Wybierz co najmniej jeden kraj europejski." : "Wpisz co najmniej jedno miasto.");
  }

  const website = normalizedWebsite(input.website, errors);
  const update: Record<string, unknown> = {
    company_name: companyName,
    nip: optionalText(input.nip),
    contact_name: optionalText(input.contact_name),
    contact_email: contactEmail,
    phone: optionalText(input.phone),
    website,
    wants_vat_invoice: bool(input.wants_vat_invoice),
    invoice_details: optionalText(input.invoice_details),
    plan_id: plan.id,
    plan_name: optionalText(input.plan_name) || plan.name,
    plan_price_pln: numberValue(input.plan_price_pln, plan.pricePln, errors, "Cena pakietu", 0, 100000),
    daily_emails: integerValue(input.daily_emails, plan.dailyEmails, errors, "Limit dzienny", 1, 500),
    monthly_emails: integerValue(input.monthly_emails, plan.monthlyEmails, errors, "Limit miesięczny", 1, 20000),
    location_scope: locationScope,
    selected_locations: selectedLocations,
    target_industries: targetIndustries,
    company_description: companyDescription,
    promoted_service: promotedService,
    value_proposition: optionalText(input.value_proposition),
    target_customer_description: optionalText(input.target_customer_description),
    target_audience_niche: optionalText(input.target_audience_niche),
    decision_maker_roles: optionalText(input.decision_maker_roles),
    target_business_model: optionalText(input.target_business_model),
    target_company_stage: optionalText(input.target_company_stage),
    target_price_segment: optionalText(input.target_price_segment),
    exact_target_business_type: optionalText(input.exact_target_business_type),
    target_business_activities: optionalText(input.target_business_activities),
    target_company_size: optionalText(input.target_company_size),
    required_online_signals: optionalText(input.required_online_signals),
    lead_qualification_rules: optionalText(input.lead_qualification_rules),
    lead_disqualification_rules: optionalText(input.lead_disqualification_rules),
    sample_email_style: optionalText(input.sample_email_style),
    must_have_signals: optionalText(input.must_have_signals),
    excluded_company_types: optionalText(input.excluded_company_types),
    search_keywords: optionalText(input.search_keywords),
    negative_keywords: optionalText(input.negative_keywords),
    preferred_lead_profile: optionalText(input.preferred_lead_profile),
    customer_pain_points: optionalText(input.customer_pain_points),
    avoid_in_messages: optionalText(input.avoid_in_messages),
    call_to_action: optionalText(input.call_to_action),
    tone: optionalText(input.tone),
    bot_first_name: optionalText(input.bot_first_name),
    bot_last_name: optionalText(input.bot_last_name),
    bot_role: optionalText(input.bot_role),
    signature_company: optionalText(input.signature_company),
    signature_website: normalizedWebsite(input.signature_website, errors),
    signature_email: optionalEmail(input.signature_email, "Email w podpisie", errors),
    signature_phone: optionalText(input.signature_phone),
    signature_address: optionalText(input.signature_address),
    signature_footer_note: optionalText(input.signature_footer_note),
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_secure: bool(input.smtp_secure, smtpPort === 465),
    smtp_user: smtpUser,
    smtp_from: optionalText(input.smtp_from),
    smtp_reply_to: smtpReplyTo || replyDestinationEmail,
    mailbox_setup_mode: mailboxSetupMode,
    desired_mailbox_local_part: desiredMailboxLocalPart,
    reply_destination_email: replyDestinationEmail,
    additional_mailbox_requested: additionalMailboxRequested,
    additional_mailbox_price_pln: additionalMailboxPricePln,
    additional_mailbox_daily_emails: additionalMailboxDailyEmails,
    total_daily_emails: totalDailyEmails,
    stripe_checkout_session_id: optionalText(input.stripe_checkout_session_id),
    stripe_customer_id: optionalText(input.stripe_customer_id),
    stripe_subscription_id: optionalText(input.stripe_subscription_id),
    stripe_payment_status: optionalText(input.stripe_payment_status),
    stripe_price_id: optionalText(input.stripe_price_id),
    stripe_product_id: optionalText(input.stripe_product_id),
    paid_at: optionalDate(input.paid_at, errors, "Data płatności"),
    payment_error: optionalText(input.payment_error),
    converted_client_id: optionalText(input.converted_client_id),
    converted_campaign_id: optionalText(input.converted_campaign_id),
    status,
  };

  const smtpPass = text(input.smtp_pass);
  if (smtpPass) {
    const encrypted = encryptSecret(smtpPass);
    update.smtp_pass_encrypted = encrypted.encrypted_value;
    update.smtp_pass_iv = encrypted.iv;
    update.smtp_pass_auth_tag = encrypted.auth_tag;
    update.smtp_pass_last4 = encrypted.value_last4;
    update.smtp_pass_provided = true;
  } else if (bool(input.smtp_pass_clear)) {
    update.smtp_pass_encrypted = null;
    update.smtp_pass_iv = null;
    update.smtp_pass_auth_tag = null;
    update.smtp_pass_last4 = null;
    update.smtp_pass_provided = false;
  }

  return errors.length ? { ok: false as const, errors } : { ok: true as const, data: update };
}

export function locationsForCampaign(order: { location_scope?: string | null; selected_locations?: string[] | null }) {
  if (order.location_scope === "poland") return ["Cała Polska"];
  if (order.location_scope === "europe") return ["Cała Europa"];
  return order.selected_locations?.length ? order.selected_locations : ["Cała Polska"];
}

export function generatePortalPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from({ length: 14 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join("");
}

export async function auditSystem(action: string, resource: string, resourceId: string | null, details?: unknown, actorEmail?: string | null) {
  const { error } = await adminDb().from("audit_logs").insert({
    actor_email: actorEmail || "system",
    action,
    resource,
    resource_id: resourceId,
    details: details || null,
  });
  if (error) console.error("audit log failed", error.message);
}

export async function convertSignupOrder(orderId: string, actorEmail?: string | null) {
  const db = adminDb();
  const { data: order, error } = await db.from("signup_orders").select("*").eq("id", orderId).single();
  if (error) throw error;
  if (!order) throw new Error("Nie znaleziono zamówienia.");
  if (order.status === "converted") throw new Error("To zamówienie jest już przekonwertowane.");
  if (order.status !== "paid") throw new Error("Najpierw zamówienie musi mieć status paid po Stripe.");

  const portalPassword = generatePortalPassword();
  const portal = hashPortalPassword(portalPassword);
  const portalEmail = String(order.contact_email || "").toLowerCase();

  const { data: client, error: clientError } = await db
    .from("client_accounts")
    .insert({
      company_name: order.company_name,
      contact_name: order.contact_name,
      contact_email: order.contact_email,
      phone: order.phone,
      website: order.website,
      subscription_price: order.plan_price_pln,
      subscription_status: "active",
      notes: `Utworzono z zamówienia BotSeller ${order.id}. Pakiet: ${order.plan_name || order.plan_id}.`,
      sender_name: order.contact_name || order.company_name,
      sender_email: order.smtp_user || order.contact_email,
      smtp_host: order.smtp_host,
      smtp_port: order.smtp_port,
      smtp_secure: order.smtp_secure,
      smtp_user: order.smtp_user,
      smtp_from: order.smtp_from,
      smtp_reply_to: order.smtp_reply_to || order.contact_email,
      bot_first_name: order.bot_first_name,
      bot_last_name: order.bot_last_name,
      bot_role: order.bot_role,
      signature_company: order.signature_company || order.company_name,
      signature_website: order.signature_website || order.website,
      signature_email: order.signature_email || order.smtp_reply_to || order.contact_email,
      signature_phone: order.signature_phone || order.phone,
      signature_address: order.signature_address,
      signature_footer_note: order.signature_footer_note,
      smtp_pass_encrypted: order.smtp_pass_encrypted,
      smtp_pass_iv: order.smtp_pass_iv,
      smtp_pass_auth_tag: order.smtp_pass_auth_tag,
      smtp_pass_last4: order.smtp_pass_last4,
      portal_email: portalEmail,
      portal_password_hash: portal.hash,
      portal_password_salt: portal.salt,
      portal_password_last4: portal.last4,
      plan_id: order.plan_id,
      plan_name: order.plan_name,
      daily_email_limit: order.daily_emails,
      monthly_email_limit: order.monthly_emails,
      stripe_customer_id: order.stripe_customer_id,
      stripe_subscription_id: order.stripe_subscription_id,
      stripe_price_id: order.stripe_price_id,
    })
    .select("id,company_name,portal_email")
    .single();
  if (clientError) throw clientError;
  if (!client?.id) throw new Error("Nie udało się utworzyć klienta.");

  const dailyLimit = Number(order.daily_emails || 20);
  const campaignName = `${order.company_name} · ${order.plan_name || "BotSeller"}`;
  const { data: campaign, error: campaignError } = await db
    .from("campaigns")
    .insert({
      client_id: client.id,
      name: campaignName,
      target_industries: order.target_industries || [],
      target_locations: locationsForCampaign(order),
      offer_description: order.promoted_service || order.company_description || campaignName,
      client_business_description: order.company_description,
      promoted_service: order.promoted_service,
      value_proposition: order.value_proposition,
      target_customer_description: order.target_customer_description,
      target_audience_niche: order.target_audience_niche,
      decision_maker_roles: order.decision_maker_roles,
      target_business_model: order.target_business_model,
      target_company_stage: order.target_company_stage,
      target_price_segment: order.target_price_segment,
      exact_target_business_type: order.exact_target_business_type,
      target_business_activities: order.target_business_activities,
      target_company_size: order.target_company_size,
      required_online_signals: order.required_online_signals,
      lead_qualification_rules: order.lead_qualification_rules,
      lead_disqualification_rules: order.lead_disqualification_rules,
      sample_email_style: order.sample_email_style,
      must_have_signals: order.must_have_signals,
      excluded_company_types: order.excluded_company_types,
      search_keywords: order.search_keywords,
      negative_keywords: order.negative_keywords,
      preferred_lead_profile: order.preferred_lead_profile,
      customer_pain_points: order.customer_pain_points,
      avoid_in_messages: order.avoid_in_messages,
      call_to_action: order.call_to_action,
      tone: order.tone || "Spokojny, konkretny, profesjonalny",
      bot_first_name: order.bot_first_name,
      bot_last_name: order.bot_last_name,
      bot_role: order.bot_role,
      signature_company: order.signature_company || order.company_name,
      signature_website: order.signature_website || order.website,
      signature_email: order.signature_email || order.smtp_reply_to || order.contact_email,
      signature_phone: order.signature_phone || order.phone,
      signature_address: order.signature_address,
      signature_footer_note: order.signature_footer_note,
      daily_limit: dailyLimit,
      min_score: 7,
      // Zamówienie z /botseller tworzy kampanię wstrzymaną.
      // Admin musi sprawdzić brief, przypisać bota i dopiero ręcznie ją aktywować.
      auto_run_enabled: false,
      auto_send_enabled: false,
      send_limit: dailyLimit,
      safety_daily_cap: dailyLimit,
      stop_on_send_failures: 5,
      follow_up_delay_days: 2,
      max_follow_ups: 1,
      test_mode: false,
      location_scope: order.location_scope || "poland",
      status: "paused",
    })
    .select("id,name")
    .single();
  if (campaignError) throw campaignError;

  const { data: orderAttachmentsRaw, error: orderAttachmentsError } = await db
    .from("signup_order_attachments")
    .select("file_name,mime_type,file_size_bytes,storage_bucket,storage_path,storage_provider,is_active")
    .eq("order_id", order.id)
    .eq("is_active", true);
  if (orderAttachmentsError) throw orderAttachmentsError;
  const orderAttachments = (orderAttachmentsRaw || []) as Array<{
    file_name: string;
    mime_type: string | null;
    file_size_bytes: number | null;
    storage_bucket: string | null;
    storage_path: string | null;
    storage_provider: string | null;
    is_active: boolean | null;
  }>;

  if (campaign?.id && orderAttachments.length) {
    const { error: attachmentCopyError } = await db.from("campaign_attachments").insert(
      orderAttachments.map((attachment) => ({
        client_id: client.id,
        campaign_id: campaign.id,
        file_name: attachment.file_name,
        mime_type: attachment.mime_type,
        file_size_bytes: attachment.file_size_bytes,
        file_data_base64: null,
        storage_bucket: attachment.storage_bucket,
        storage_path: attachment.storage_path,
        storage_provider: attachment.storage_provider || "supabase_storage",
        is_active: true,
      })),
    );
    if (attachmentCopyError) throw attachmentCopyError;
  }

  const { error: updateError } = await db
    .from("signup_orders")
    .update({
      status: "converted",
      converted_client_id: client.id,
      converted_campaign_id: campaign?.id || null,
      converted_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (updateError) throw updateError;

  await auditSystem("convert_signup_order", "signup_orders", order.id, { client_id: client.id, campaign_id: campaign?.id || null, attachments: orderAttachments?.length || 0 }, actorEmail);

  return {
    clientId: client.id as string,
    campaignId: campaign?.id as string,
    portalEmail,
    portalPassword,
  };
}
