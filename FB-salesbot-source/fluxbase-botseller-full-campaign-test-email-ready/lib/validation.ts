import {
  BOT_STATUSES,
  CAMPAIGN_STATUSES,
  LEAD_STATUSES,
  MESSAGE_STATUSES,
  SECRET_PROVIDERS,
  SUBSCRIPTION_STATUSES,
  type AdminResource,
  type BotStatus,
  type CampaignStatus,
  type LeadStatus,
  type MessageStatus,
  type SecretProvider,
  type SubscriptionStatus,
} from "@/lib/types";

type RecordLike = Record<string, unknown>;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

export type ClientPayload = {
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  subscription_price: number | null;
  subscription_status: SubscriptionStatus;
  notes: string | null;
  sender_name: string | null;
  sender_email: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean;
  smtp_user: string | null;
  smtp_from: string | null;
  smtp_reply_to: string | null;
  dkim_selector: string | null;
  bot_first_name: string | null;
  bot_last_name: string | null;
  bot_role: string | null;
  signature_company: string | null;
  signature_website: string | null;
  signature_email: string | null;
  signature_phone: string | null;
  signature_address: string | null;
  signature_footer_note: string | null;
  smtp_pass: string | null;
  portal_email: string | null;
  portal_password: string | null;
};

export type CampaignPayload = {
  client_id: string;
  bot_id: string | null;
  name: string;
  target_industries: string[];
  target_locations: string[];
  offer_description: string;
  client_business_description: string | null;
  promoted_service: string | null;
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
  bot_first_name: string | null;
  bot_last_name: string | null;
  bot_role: string | null;
  signature_company: string | null;
  signature_website: string | null;
  signature_email: string | null;
  signature_phone: string | null;
  signature_address: string | null;
  signature_footer_note: string | null;
  daily_limit: number;
  warmup_daily_limits: number[];
  monthly_limit: number | null;
  min_score: number;
  tone: string | null;
  auto_run_enabled: boolean;
  auto_send_enabled: boolean;
  requires_approval_before_send: boolean;
  send_on_weekends: boolean;
  send_limit: number;
  safety_daily_cap: number;
  send_delay_min_seconds: number;
  send_delay_max_seconds: number;
  workday_start_hour: number;
  workday_end_hour: number;
  sending_timezone: string;
  stop_on_send_failures: number;
  follow_up_delay_days: number;
  max_follow_ups: number;
  test_mode: boolean;
  location_scope: string | null;
  status: CampaignStatus;
};

export type LeadPayload = {
  client_id: string | null;
  campaign_id: string | null;
  company_name: string;
  industry: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  source: string;
  score: number;
  status: LeadStatus;
  main_problem: string | null;
  ai_summary: string | null;
  generated_subject: string | null;
  generated_email: string | null;
  google_maps_url: string | null;
};

export type SecretPayload = {
  provider: SecretProvider;
  label: string;
  secret: string;
};

export type BotPayload = {
  name: string;
  status: "active" | "paused" | "maintenance";
  provider: string | null;
  model: string | null;
  max_parallel_campaigns: number;
  notes: string | null;
  api_key?: string | null;
  api_key_action?: "preserve" | "replace" | "clear";
};

export type StatusPatch =
  | { subscription_status: SubscriptionStatus }
  | { status: CampaignStatus | LeadStatus | MessageStatus | BotStatus | "pending" | "cancelled" };

const SEND_QUEUE_ACTION_STATUSES = ["pending", "cancelled"] as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): RecordLike {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordLike) : {};
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function rawText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function optionalText(value: unknown): string | null {
  const next = text(value);
  return next ? next : null;
}

function requiredText(input: RecordLike, key: string, label: string, errors: string[]): string {
  const value = text(input[key]);
  if (!value) errors.push(`${label} jest wymagane.`);
  return value;
}

function optionalEmail(value: unknown, label: string, errors: string[]): string | null {
  const next = text(value);
  if (!next) return null;
  if (!emailPattern.test(next)) errors.push(`${label} ma niepoprawny format.`);
  return next.toLowerCase();
}

function optionalUrl(value: unknown, label: string, errors: string[]): string | null {
  const next = text(value);
  if (!next) return null;
  const candidate = /^https?:\/\//i.test(next) ? next : `https://${next}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) {
      errors.push(`${label} ma niepoprawny adres.`);
      return next;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    errors.push(`${label} ma niepoprawny adres.`);
    return next;
  }
}

function optionalUuid(value: unknown, label: string, errors: string[]): string | null {
  const next = text(value);
  if (!next) return null;
  if (!uuidPattern.test(next)) errors.push(`${label} ma niepoprawny identyfikator.`);
  return next;
}

function requiredUuid(input: RecordLike, key: string, label: string, errors: string[]): string {
  const next = text(input[key]);
  if (!next) errors.push(`${label} jest wymagany.`);
  else if (!uuidPattern.test(next)) errors.push(`${label} ma niepoprawny identyfikator.`);
  return next;
}

function optionalBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  const next = text(value).toLowerCase();
  if (["true", "1", "yes", "on", "tak"].includes(next)) return true;
  if (["false", "0", "no", "off", "nie"].includes(next)) return false;
  return fallback;
}

function optionalMoney(value: unknown, label: string, errors: string[]): number | null {
  const next = text(value).replace(",", ".");
  if (!next) return null;
  const parsed = Number(next);
  if (!Number.isFinite(parsed) || parsed < 0) {
    errors.push(`${label} musi być liczbą większą lub równą 0.`);
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

function boundedInt(
  value: unknown,
  label: string,
  errors: string[],
  options: { min: number; max: number; fallback: number },
): number {
  const next = text(value);
  if (!next) return options.fallback;
  const parsed = Number(next);
  if (!Number.isInteger(parsed) || parsed < options.min || parsed > options.max) {
    errors.push(`${label} musi być liczbą całkowitą od ${options.min} do ${options.max}.`);
    return options.fallback;
  }
  return parsed;
}


function requiredBoundedInt(
  value: unknown,
  label: string,
  errors: string[],
  options: { min: number; max: number },
): number {
  const next = text(value);
  if (!next) {
    errors.push(`${label} jest wymagany.`);
    return options.min;
  }
  const parsed = Number(next);
  if (!Number.isInteger(parsed) || parsed < options.min || parsed > options.max) {
    errors.push(`${label} musi być liczbą całkowitą od ${options.min} do ${options.max}.`);
    return options.min;
  }
  return parsed;
}

function optionalBoundedInt(
  value: unknown,
  label: string,
  errors: string[],
  options: { min: number; max: number },
): number | null {
  const next = text(value);
  if (!next) return null;
  const parsed = Number(next);
  if (!Number.isInteger(parsed) || parsed < options.min || parsed > options.max) {
    errors.push(`${label} musi być pusty albo liczbą całkowitą od ${options.min} do ${options.max}.`);
    return null;
  }
  return parsed;
}

function warmupDailyLimits(value: unknown, errors: string[]): number[] {
  const raw = Array.isArray(value) ? value : list(value);
  const limits = raw
    .map((item) => Number(text(item)))
    .filter((item) => Number.isFinite(item))
    .map((item) => Math.round(item));

  if (!limits.length) {
    errors.push("Uzupełnij harmonogram warm-upu kampanii, np. 5, 10, 15, 20, 50.");
    return [1];
  }

  const cleaned: number[] = [];
  limits.forEach((limit, index) => {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      errors.push(`Warm-up dzień ${index + 1} musi być liczbą całkowitą od 1 do 500.`);
      return;
    }
    const previous = cleaned[cleaned.length - 1];
    if (previous !== undefined && limit < previous) {
      errors.push(`Warm-up dzień ${index + 1} nie może być mniejszy niż poprzedni dzień.`);
      return;
    }
    cleaned.push(limit);
  });

  if (!cleaned.length) return [1];
  return cleaned;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return text(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isOneOf<T extends readonly string[]>(value: string, allowed: T): value is T[number] {
  return (allowed as readonly string[]).includes(value);
}

function status<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
  label: string,
  errors: string[],
): T[number] {
  const next = text(value) || fallback;
  if (!isOneOf(next, allowed)) {
    errors.push(`${label} ma nieobsługiwaną wartość.`);
    return fallback;
  }
  return next;
}

function result<T>(errors: string[], data: T): ValidationResult<T> {
  return errors.length ? { ok: false, errors } : { ok: true, data };
}

export function validateClientPayload(value: unknown): ValidationResult<ClientPayload> {
  const input = asRecord(value);
  const errors: string[] = [];
  const smtpPort = text(input.smtp_port) ? boundedInt(input.smtp_port, "Port SMTP", errors, { min: 1, max: 65535, fallback: 465 }) : null;
  const data: ClientPayload = {
    company_name: requiredText(input, "company_name", "Nazwa firmy", errors),
    contact_name: optionalText(input.contact_name),
    contact_email: optionalEmail(input.contact_email, "Email klienta", errors),
    phone: optionalText(input.phone),
    website: optionalUrl(input.website, "Strona klienta", errors),
    subscription_price: optionalMoney(input.subscription_price, "Abonament", errors),
    subscription_status: status(input.subscription_status, SUBSCRIPTION_STATUSES, "active", "Status abonamentu", errors),
    notes: optionalText(input.notes),
    sender_name: optionalText(input.sender_name),
    sender_email: optionalEmail(input.sender_email, "Email nadawcy", errors),
    smtp_host: optionalText(input.smtp_host),
    smtp_port: smtpPort,
    smtp_secure: optionalBoolean(input.smtp_secure, true),
    smtp_user: optionalText(input.smtp_user),
    smtp_from: optionalText(input.smtp_from),
    smtp_reply_to: optionalEmail(input.smtp_reply_to, "Reply-To", errors),
    dkim_selector: optionalText(input.dkim_selector),
    bot_first_name: optionalText(input.bot_first_name),
    bot_last_name: optionalText(input.bot_last_name),
    bot_role: optionalText(input.bot_role),
    signature_company: optionalText(input.signature_company),
    signature_website: optionalUrl(input.signature_website, "Strona w podpisie", errors),
    signature_email: optionalEmail(input.signature_email, "Email w podpisie", errors),
    signature_phone: optionalText(input.signature_phone),
    signature_address: optionalText(input.signature_address),
    signature_footer_note: optionalText(input.signature_footer_note),
    smtp_pass: optionalText(input.smtp_pass),
    portal_email: optionalEmail(input.portal_email, "Login do panelu klienta", errors),
    portal_password: optionalText(input.portal_password),
  };
  if (data.portal_password && data.portal_password.length < 8) {
    errors.push("Hasło do panelu klienta musi mieć minimum 8 znaków.");
  }
  return result(errors, data);
}

export function validateCampaignPayload(value: unknown): ValidationResult<CampaignPayload> {
  const input = asRecord(value);
  const errors: string[] = [];
  const targetIndustries = list(input.target_industries);
  if (!targetIndustries.length) errors.push("Uzupełnij pole: jakich firm szukamy.");
  const data: CampaignPayload = {
    client_id: requiredUuid(input, "client_id", "Klient", errors),
    bot_id: optionalUuid(input.bot_id, "Bot", errors),
    name: requiredText(input, "name", "Nazwa kampanii", errors),
    target_industries: targetIndustries,
    target_locations: list(input.target_locations),
    offer_description: requiredText(input, "offer_description", "Jaką ofertę proponujemy", errors),
    client_business_description: optionalText(input.client_business_description),
    promoted_service: optionalText(input.promoted_service),
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
    bot_first_name: optionalText(input.bot_first_name),
    bot_last_name: optionalText(input.bot_last_name),
    bot_role: optionalText(input.bot_role),
    signature_company: optionalText(input.signature_company),
    signature_website: optionalUrl(input.signature_website, "Strona w podpisie", errors),
    signature_email: optionalEmail(input.signature_email, "Email w podpisie", errors),
    signature_phone: optionalText(input.signature_phone),
    signature_address: optionalText(input.signature_address),
    signature_footer_note: optionalText(input.signature_footer_note),
    daily_limit: 1,
    warmup_daily_limits: [],
    monthly_limit: optionalBoundedInt(input.monthly_limit, "Limit miesięczny kampanii", errors, { min: 1, max: 20000 }),
    min_score: boundedInt(input.min_score, "Minimalny score leada", errors, { min: 0, max: 10, fallback: 7 }),
    tone: optionalText(input.tone),
    auto_run_enabled: optionalBoolean(input.auto_run_enabled, true),
    auto_send_enabled: true,
    requires_approval_before_send: optionalBoolean(input.requires_approval_before_send, false),
    send_on_weekends: optionalBoolean(input.send_on_weekends, false),
    // Pola poniżej zostają w bazie tylko dla kompatybilności ze starszymi rekordami.
    // Aktualna logika wysyłki używa warmup_daily_limits, a daily_limit jest ostatnim progiem harmonogramu.
    send_limit: 1,
    safety_daily_cap: 1,
    send_delay_min_seconds: 0,
    send_delay_max_seconds: 0,
    workday_start_hour: requiredBoundedInt(input.workday_start_hour, "Godzina startu pracy bota", errors, { min: 0, max: 23 }),
    workday_end_hour: requiredBoundedInt(input.workday_end_hour, "Godzina końca pracy bota", errors, { min: 1, max: 24 }),
    sending_timezone: requiredText(input, "sending_timezone", "Strefa czasowa wysyłki", errors),
    stop_on_send_failures: boundedInt(input.stop_on_send_failures, "Stop po błędach wysyłki", errors, { min: 1, max: 50, fallback: 5 }),
    follow_up_delay_days: boundedInt(input.follow_up_delay_days, "Follow-up po dniach", errors, { min: 1, max: 30, fallback: 2 }),
    max_follow_ups: boundedInt(input.max_follow_ups, "Maksymalna liczba follow-upów", errors, { min: 0, max: 5, fallback: 1 }),
    test_mode: optionalBoolean(input.test_mode, false),
    location_scope: optionalText(input.location_scope),
    status: status(input.status, CAMPAIGN_STATUSES, "active", "Status kampanii", errors),
  };
  const limits = warmupDailyLimits(input.warmup_daily_limits, errors);
  const finalDailyLimit = limits[limits.length - 1] || 1;
  data.warmup_daily_limits = limits;
  data.daily_limit = finalDailyLimit;
  data.send_limit = finalDailyLimit;
  data.safety_daily_cap = finalDailyLimit;
  if (data.workday_end_hour <= data.workday_start_hour) errors.push("Godzina końca pracy bota musi być późniejsza niż start.");
  return result(errors, data);
}

export function validateLeadPayload(value: unknown): ValidationResult<LeadPayload> {
  const input = asRecord(value);
  const errors: string[] = [];
  const data: LeadPayload = {
    client_id: optionalUuid(input.client_id, "Klient", errors),
    campaign_id: optionalUuid(input.campaign_id, "Kampania", errors),
    company_name: requiredText(input, "company_name", "Nazwa firmy", errors),
    industry: optionalText(input.industry),
    city: optionalText(input.city),
    phone: optionalText(input.phone),
    website: optionalUrl(input.website, "Strona leada", errors),
    email: optionalEmail(input.email, "Email leada", errors),
    source: optionalText(input.source) ?? "manual",
    score: boundedInt(input.score, "Score", errors, { min: 0, max: 10, fallback: 0 }),
    status: status(input.status, LEAD_STATUSES, "new", "Status leada", errors),
    main_problem: optionalText(input.main_problem),
    ai_summary: optionalText(input.ai_summary),
    generated_subject: optionalText(input.generated_subject),
    generated_email: optionalText(input.generated_email),
    google_maps_url: optionalUrl(input.google_maps_url, "Google Maps URL", errors),
  };
  return result(errors, data);
}

export type MessagePayload = {
  subject: string | null;
  body: string | null;
  status: MessageStatus;
};

export type SuppressionPayload = {
  client_id: string | null;
  email: string | null;
  domain: string | null;
  company_name: string | null;
  reason: string | null;
};

export function validateMessagePayload(value: unknown): ValidationResult<MessagePayload> {
  const input = asRecord(value);
  const errors: string[] = [];
  const data: MessagePayload = {
    subject: optionalText(input.subject),
    body: optionalText(input.body),
    status: status(input.status, MESSAGE_STATUSES, "draft", "Status wiadomości", errors),
  };
  return result(errors, data);
}

export function validateSuppressionPayload(value: unknown): ValidationResult<SuppressionPayload> {
  const input = asRecord(value);
  const errors: string[] = [];
  const email = optionalEmail(input.email, "Email blokowany", errors);
  const domainValue = optionalText(input.domain)?.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase() || null;
  if (!email && !domainValue && !optionalText(input.company_name)) errors.push("Dodaj email, domenę albo nazwę firmy do blokady.");
  return result(errors, {
    client_id: optionalUuid(input.client_id, "Klient", errors),
    email,
    domain: domainValue,
    company_name: optionalText(input.company_name),
    reason: optionalText(input.reason),
  });
}

export function validateBotPayload(value: unknown): ValidationResult<BotPayload> {
  const input = asRecord(value);
  const errors: string[] = [];
  const statusValue = status(input.status, ["active", "paused", "maintenance"] as const, "active", "Status bota", errors);
  return result(errors, {
    name: requiredText(input, "name", "Nazwa bota", errors),
    status: statusValue,
    provider: optionalText(input.provider) || "openai",
    model: optionalText(input.model) || "gpt-5.5",
    max_parallel_campaigns: boundedInt(input.max_parallel_campaigns, "Limit kampanii na bota", errors, { min: 1, max: 10, fallback: 1 }),
    notes: optionalText(input.notes),
    api_key: rawText(input.api_key).trim() || null,
    api_key_action: status(input.api_key_action, ["preserve", "replace", "clear"] as const, rawText(input.api_key).trim() ? "replace" : "preserve", "Akcja API key", errors),
  });
}

export function validateSecretPayload(value: unknown): ValidationResult<SecretPayload> {
  const input = asRecord(value);
  const errors: string[] = [];
  const provider = status(input.provider, SECRET_PROVIDERS, "openai", "Typ sekretu", errors);
  const secret = rawText(input.secret);
  if (!secret.trim()) errors.push("Sekret jest wymagany.");
  const label = optionalText(input.label) ?? provider;
  return result(errors, { provider, label, secret });
}

export function validateStatusPatch(resource: AdminResource, value: unknown): ValidationResult<StatusPatch> {
  const input = asRecord(value);
  const errors: string[] = [];
  if (resource === "client_accounts") {
    return result(errors, {
      subscription_status: status(input.subscription_status, SUBSCRIPTION_STATUSES, "active", "Status abonamentu", errors),
    });
  }
  if (resource === "campaigns") {
    return result(errors, {
      status: status(input.status, CAMPAIGN_STATUSES, "active", "Status kampanii", errors),
    });
  }
  if (resource === "bots") {
    return result(errors, {
      status: status(input.status, BOT_STATUSES, "active", "Status bota", errors),
    });
  }
  if (resource === "leads") {
    return result(errors, {
      status: status(input.status, LEAD_STATUSES, "new", "Status leada", errors),
    });
  }
  if (resource === "send_queue") {
    return result(errors, {
      status: status(input.status, SEND_QUEUE_ACTION_STATUSES, "pending", "Status kolejki", errors),
    });
  }
  return result(errors, {
    status: status(input.status, MESSAGE_STATUSES, "draft", "Status wiadomości", errors),
  });
}

export function validateRecordId(value: unknown): ValidationResult<string> {
  const errors: string[] = [];
  const id = text(value);
  if (!id) errors.push("Brakuje identyfikatora rekordu.");
  else if (!uuidPattern.test(id)) errors.push("Identyfikator rekordu ma niepoprawny format.");
  return result(errors, id);
}
