"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  ChartCard,
  DashboardShell,
  DonutChart,
  EmptyState,
  InputField,
  LineChart,
  MetricCard,
  Notice as NoticeBox,
  Panel,
  ProgressBar,
  ScreenHeader,
  SelectField,
  Sidebar,
  StatusBadge,
  TableCard,
  TextAreaField,
} from "@/components/admin/ui";
import { BOTSELLER_PLANS } from "@/lib/pricing";
import { EUROPE_COUNTRY_NAMES_FOR_EUROPE_PLAN, LOCATION_SCOPE_LABELS, VOIVODESHIP_NAMES } from "@/lib/locationOptions";
import {
  CAMPAIGN_STATUSES,
  LEAD_STATUSES,
  SECRET_PROVIDERS,
  SUBSCRIPTION_STATUSES,
  type AdminData,
  type AdminResource,
  type Campaign,
  type CampaignAttachment,
  type ClientAccount,
  type Lead,
  type Message,
  type SecretSummary,
  type SignupOrder,
  type Bot,
} from "@/lib/types";

export type TabId = "dashboard" | "operations" | "bots" | "clients" | "campaigns" | "leads" | "messages" | "runs" | "queue" | "aiUsage" | "suppression" | "audit" | "billing" | "orders" | "settings";
export type NoticeState = { tone: "info" | "success" | "warning" | "danger"; message: string } | null;

export type DnsCheckResult = {
  domain: string;
  checkedAt: string;
  dkimSelectorsChecked?: string[];
  checks: Array<{ key: string; label: string; status: "ok" | "warning" | "missing" | string; message: string; records: string[] }>;
};
export type MutateAction = "create" | "update" | "delete" | "updateStatus";
export type ClientDetails = {
  client: ClientAccount;
  campaigns: Campaign[];
  leads: Lead[];
  messages: Message[];
  counts: { campaigns: number; leads: number; messages: number };
};

export const emptyData: AdminData = {
  bots: [],
  clients: [],
  campaigns: [],
  leads: [],
  messages: [],
  campaignRuns: [],
  runLogs: [],
  suppressionList: [],
  auditLogs: [],
  signupOrders: [],
  signupOrderAttachments: [],
  campaignAttachments: [],
  sendQueue: [],
  sendQueueSummary: { nextSendAt: null, todayTotal: 0, pending: 0, processing: 0, sent: 0, failed: 0 },
  usageSummary: {
    sentToday: 0,
    sentThisMonth: 0,
    totalDailyTarget: 0,
    totalMonthlyTarget: 0,
    dailyRemaining: 0,
    monthlyRemaining: 0,
    activeCampaignsWithLimits: 0,
    campaignsMissingLimits: 0,
  },
  aiUsageSummary: {
    totalRequests: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    todayCostUsd: 0,
    monthCostUsd: 0,
    avgCostUsd: 0,
    pricing: { model: "gpt-5.5", inputUsdPer1M: 5, cachedInputUsdPer1M: 0.5, outputUsdPer1M: 30 },
  },
  aiUsageLogs: [],
  adminNotifications: [],
};
function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

export const tabs: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: "dashboard", label: "Start", icon: <NavIcon><path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4Z" /></NavIcon> },
  { id: "orders", label: "Zamówienia", icon: <NavIcon><path d="M7 4h10l2 4v12H5V8Z" /><path d="M7 8h10" /><path d="M9 13h6" /><path d="M9 17h4" /></NavIcon> },
  { id: "operations", label: "Operacje", icon: <NavIcon><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h10" /><circle cx="17" cy="18" r="2" /></NavIcon> },
  { id: "campaigns", label: "Kampanie", icon: <NavIcon><path d="m4 12 16-8-4 16-3.5-6.5L4 12Zm0 0 8.5 1.5" /></NavIcon> },
  { id: "bots", label: "Boty", icon: <NavIcon><path d="M7 8h10v8H7Z" /><path d="M9 4h6" /><path d="M12 4v4" /><circle cx="10" cy="12" r="1" /><circle cx="14" cy="12" r="1" /><path d="M9 18h6" /></NavIcon> },
  { id: "runs", label: "Runy", icon: <NavIcon><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M18.5 10a7 7 0 0 0-12-3" /><path d="M5.5 14a7 7 0 0 0 12 3" /></NavIcon> },
  { id: "queue", label: "Kolejka", icon: <NavIcon><path d="M5 7h14" /><path d="M5 12h14" /><path d="M5 17h9" /></NavIcon> },
  { id: "aiUsage", label: "Zużycie AI", icon: <NavIcon><path d="M5 19 19 5" /><path d="M7 7h.01" /><path d="M17 17h.01" /><path d="M8 17h8" /><path d="M12 13v8" /></NavIcon> },
  { id: "clients", label: "Klienci", icon: <NavIcon><path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M3.5 20a5 5 0 0 1 10 0" /><path d="M16 11.5a2.5 2.5 0 1 0 0-5" /><path d="M16.5 15a4.5 4.5 0 0 1 4 5" /></NavIcon> },
  { id: "leads", label: "Leady", icon: <NavIcon><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></NavIcon> },
  { id: "messages", label: "Wiadomości", icon: <NavIcon><path d="M5 6h14v10H8l-3 3Z" /></NavIcon> },
  { id: "suppression", label: "Blacklist", icon: <NavIcon><circle cx="12" cy="12" r="8" /><path d="m7 7 10 10" /></NavIcon> },
  { id: "billing", label: "Billing", icon: <NavIcon><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M4 10h16" /></NavIcon> },
  { id: "settings", label: "Sekrety", icon: <NavIcon><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></NavIcon> },
  { id: "audit", label: "Audyt", icon: <NavIcon><path d="M8 6h11" /><path d="M8 12h11" /><path d="M8 18h11" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" /></NavIcon> },
];

export const VISIBLE_LEAD_FILTER_STATUSES = ["sent", "do_not_contact", "failed"] as const;
export const VISIBLE_MESSAGE_FILTER_STATUSES = ["sent", "delivered", "opened", "replied", "follow_up_sent", "bounced", "spam", "unsubscribed"] as const;

export const SENT_OR_DELIVERED_STATUSES = ["sent", "delivered", "opened", "replied", "follow_up_sent"] as const;

export function isSentLike(message: { status: string; sent_at?: string | null }) {
  return Boolean(message.sent_at) || SENT_OR_DELIVERED_STATUSES.includes(message.status as any);
}

export function isDeliveredLike(message: { status: string; sent_at?: string | null; delivered_at?: string | null }) {
  // W BotSeller przyjęcie przez SMTP traktujemy w panelu jako dostarczenie.
  return isSentLike(message) || Boolean(message.delivered_at);
}

export const statusLabels: Record<string, string> = {
  active: "Aktywny",
  paused: "Pauza",
  cancel_requested: "Anulowanie zgłoszone",
  cancelled: "Anulowany",
  new: "Nowy",
  email_found: "Email znaleziony",
  email_missing: "Brak emaila",
  queued: "W kolejce",
  sending: "Wysyłanie",
  sent: "Wysłany",
  delivered: "Dostarczony",
  opened: "Otwarty",
  replied: "Odpowiedź",
  follow_up_sent: "Follow-up wysłany",
  bounced: "Bounce",
  spam: "Spam",
  unsubscribed: "Wypisany",
  failed: "Błąd",
  partial: "Częściowo",
  completed: "Zakończony",
  running: "W trakcie",
  do_not_contact: "Nie kontaktować",
  draft: "Szkic",
  pending: "Oczekujące",
  pending_payment: "Oczekuje płatności",
  paid: "Opłacone",
  payment_failed: "Płatność nieudana",
  converted: "Aktywowane",
  rejected: "Odrzucone",
};

export const initialClientForm = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  phone: "",
  website: "",
  subscription_price: "2000",
  subscription_status: "active",
  notes: "",
  sender_name: "",
  sender_email: "",
  smtp_host: "smtp.gmail.com",
  smtp_port: "465",
  smtp_secure: true,
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "",
  smtp_reply_to: "",
  dkim_selector: "",
  bot_first_name: "",
  bot_last_name: "",
  bot_role: "",
  signature_company: "",
  signature_website: "",
  signature_email: "",
  signature_phone: "",
  signature_address: "",
  signature_footer_note: "",
  portal_email: "",
  portal_password: "",
};

export const initialCampaignForm = {
  client_id: "",
  bot_id: "",
  name: "",
  target_industries: "",
  target_locations: "Cała Polska",
  offer_description: "",
  client_business_description: "",
  promoted_service: "",
  value_proposition: "",
  target_customer_description: "",
  target_audience_niche: "",
  decision_maker_roles: "",
  target_business_model: "",
  target_company_stage: "",
  target_price_segment: "",
  exact_target_business_type: "",
  target_business_activities: "",
  target_company_size: "",
  required_online_signals: "",
  lead_qualification_rules: "",
  lead_disqualification_rules: "",
  sample_email_style: "",
  must_have_signals: "",
  excluded_company_types: "",
  search_keywords: "",
  negative_keywords: "",
  preferred_lead_profile: "",
  customer_pain_points: "",
  avoid_in_messages: "",
  call_to_action: "",
  bot_first_name: "",
  bot_last_name: "",
  bot_role: "",
  signature_company: "",
  signature_website: "",
  signature_email: "",
  signature_phone: "",
  signature_address: "",
  signature_footer_note: "",
  daily_limit: "",
  warmup_daily_limits: [""],
  monthly_limit: "",
  min_score: "7",
  tone: "Spokojny, konkretny, profesjonalny",
  auto_run_enabled: true,
  auto_send_enabled: true,
  requires_approval_before_send: false,
  send_on_weekends: false,
  send_limit: "",
  safety_daily_cap: "",
  send_delay_min_seconds: "0",
  send_delay_max_seconds: "0",
  workday_start_hour: "",
  workday_end_hour: "",
  sending_timezone: "Europe/Warsaw",
  stop_on_send_failures: "5",
  follow_up_delay_days: "2",
  max_follow_ups: "1",
  follow_ups_enabled: false,
  test_mode: false,
  location_scope: "poland",
  status: "active",
};

export const initialLeadForm = {
  client_id: "",
  campaign_id: "",
  company_name: "",
  industry: "",
  city: "",
  phone: "",
  website: "",
  email: "",
  google_maps_url: "",
  source: "manual",
  score: "0",
  status: "new",
  main_problem: "",
  ai_summary: "",
  generated_subject: "",
  generated_email: "",
};

export const initialSecretForm = { provider: "openai", label: "", secret: "" };
export const initialLeadFilters = {
  clientId: "",
  campaignId: "",
  status: "",
  minScore: "",
  missingEmail: false,
  ready: false,
  sent: false,
};
export const initialMessageFilters = { clientId: "", campaignId: "", status: "" };
export const initialSuppressionForm = { client_id: "", email: "", domain: "", company_name: "", reason: "" };

export const initialOrderEditForm = {
  company_name: "",
  nip: "",
  contact_name: "",
  contact_email: "",
  phone: "",
  website: "",
  wants_vat_invoice: false,
  invoice_details: "",
  plan_id: "starter",
  plan_name: "",
  plan_price_pln: "999",
  daily_emails: "20",
  monthly_emails: "600",
  location_scope: "poland",
  selected_locations: "Cała Polska",
  target_industries: "",
  company_description: "",
  promoted_service: "",
  value_proposition: "",
  target_customer_description: "",
  target_audience_niche: "",
  decision_maker_roles: "",
  target_business_model: "",
  target_company_stage: "",
  target_price_segment: "",
  exact_target_business_type: "",
  target_business_activities: "",
  target_company_size: "",
  required_online_signals: "",
  lead_qualification_rules: "",
  lead_disqualification_rules: "",
  sample_email_style: "",
  must_have_signals: "",
  excluded_company_types: "",
  search_keywords: "",
  negative_keywords: "",
  preferred_lead_profile: "",
  customer_pain_points: "",
  avoid_in_messages: "",
  call_to_action: "",
  tone: "",
  bot_first_name: "",
  bot_last_name: "",
  bot_role: "",
  signature_company: "",
  signature_website: "",
  signature_email: "",
  signature_phone: "",
  signature_address: "",
  signature_footer_note: "",
  smtp_host: "smtp.gmail.com",
  smtp_port: "465",
  smtp_secure: true,
  smtp_user: "",
  smtp_from: "",
  smtp_reply_to: "",
  mailbox_setup_mode: "fluxbase_setup",
  desired_mailbox_local_part: "",
  reply_destination_email: "",
  additional_mailbox_requested: false,
  additional_mailbox_price_pln: "0",
  additional_mailbox_daily_emails: "0",
  total_daily_emails: "20",
  onboarding_step: "0",
  onboarding_step_label: "",
  onboarding_completed: false,
  smtp_pass: "",
  smtp_pass_clear: false,
  stripe_checkout_session_id: "",
  stripe_customer_id: "",
  stripe_subscription_id: "",
  stripe_payment_status: "",
  stripe_price_id: "",
  stripe_product_id: "",
  paid_at: "",
  payment_error: "",
  converted_client_id: "",
  converted_campaign_id: "",
  status: "pending",
};

export function statusLabel(status?: string | null) {
  return statusLabels[status || ""] || status || "Brak";
}

export function formatPrice(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function numberFromForm(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function campaignWarmupLimits(form: Pick<typeof initialCampaignForm, "warmup_daily_limits" | "daily_limit">) {
  const raw = Array.isArray(form.warmup_daily_limits) ? form.warmup_daily_limits : [];
  const limits = raw
    .map((item) => Math.round(numberFromForm(item, 0)))
    .filter((item) => Number.isFinite(item) && item > 0);
  if (limits.length) return limits;
  const fallback = Math.round(numberFromForm(form.daily_limit, 0));
  return fallback > 0 ? [fallback] : [];
}

export function warmupLimitForPreview(form: Pick<typeof initialCampaignForm, "warmup_daily_limits" | "daily_limit">, dayIndex = 0) {
  const limits = campaignWarmupLimits(form);
  if (!limits.length) return { enabled: true, day: 1, limit: 0, target: 0, limits };
  const index = Math.max(Math.round(dayIndex), 0);
  const target = limits[limits.length - 1];
  const limit = limits[Math.min(index, limits.length - 1)] || target;
  return { enabled: true, day: index + 1, limit, target, limits };
}


function daysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function isWeekendDate(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function automaticMonthlyPreview(form: typeof initialCampaignForm, client?: ClientAccount | null) {
  const now = new Date();
  const days = daysInCurrentMonth();
  const rawDaily = Math.max(Math.round(numberFromForm(form.daily_limit, 0)), 0);
  if (rawDaily <= 0) return { days, eligibleDays: 0, total: 0, weekendsExcluded: !form.send_on_weekends };
  let eligibleDays = 0;
  let total = 0;
  for (let day = 1; day <= days; day += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0);
    if (!form.send_on_weekends && isWeekendDate(date)) continue;
    const warmup = warmupLimitForPreview(form, Math.max(0, day - 1));
    total += form.test_mode ? Math.min(warmup.limit, 3) : warmup.limit;
    eligibleDays += 1;
  }
  return { days, eligibleDays, total, weekendsExcluded: !form.send_on_weekends };
}

export function campaignScheduleInfo(form: typeof initialCampaignForm, client?: ClientAccount | null) {
  const limits = campaignWarmupLimits(form);
  const rawDaily = limits[limits.length - 1] || Math.max(Math.round(numberFromForm(form.daily_limit, 0)), 0);
  const currentWarmup = warmupLimitForPreview(form, 0);
  const daily = form.test_mode ? Math.min(currentWarmup.limit || rawDaily, 3) : (currentWarmup.limit || rawDaily);
  const parsedStartHour = Number(form.workday_start_hour);
  const parsedEndHour = Number(form.workday_end_hour);
  const hasWorkWindow = Number.isFinite(parsedStartHour) && Number.isFinite(parsedEndHour) && form.workday_start_hour.trim() !== "" && form.workday_end_hour.trim() !== "";
  const startHour = hasWorkWindow ? Math.min(Math.max(Math.round(parsedStartHour), 0), 23) : null;
  const endHour = hasWorkWindow && startHour !== null ? Math.min(Math.max(Math.round(parsedEndHour), startHour + 1), 24) : null;
  const minutes = startHour !== null && endHour !== null ? Math.max((endHour - startHour) * 60, 1) : 0;
  const interval = minutes > 0 ? Math.max(Math.round(minutes / Math.max(daily, 1)), 1) : 0;
  const warmup = currentWarmup;
  const manualMonthly = numberFromForm(form.monthly_limit, 0);
  const monthly = manualMonthly > 0 ? { mode: "manual" as const, limit: manualMonthly } : { mode: "auto" as const, ...automaticMonthlyPreview(form, client) };
  return { rawDaily, daily, startHour, endHour, minutes, interval, warmup, monthly, timezone: form.sending_timezone || "Europe/Warsaw", warmupLimits: limits, hasWorkWindow };
}
export function formatFileSize(value?: number | null) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function filesFromInput(list: FileList | null) {
  return Array.from(list || []);
}


export function joinList(value: string[] | null) {
  return value?.length ? value.join(", ") : "-";
}

export function formFromClient(client: ClientAccount) {
  return {
    company_name: client.company_name,
    contact_name: client.contact_name || "",
    contact_email: client.contact_email || "",
    phone: client.phone || "",
    website: client.website || "",
    subscription_price: client.subscription_price === null ? "" : String(client.subscription_price),
    subscription_status: client.subscription_status,
    notes: client.notes || "",
    sender_name: client.sender_name || "",
    sender_email: client.sender_email || "",
    smtp_host: client.smtp_host || "smtp.gmail.com",
    smtp_port: client.smtp_port === null ? "465" : String(client.smtp_port),
    smtp_secure: client.smtp_secure !== false,
    smtp_user: client.smtp_user || "",
    smtp_pass: "",
    smtp_from: client.smtp_from || "",
    smtp_reply_to: client.smtp_reply_to || "",
    dkim_selector: client.dkim_selector || "",
    bot_first_name: client.bot_first_name || "",
    bot_last_name: client.bot_last_name || "",
    bot_role: client.bot_role || "",
    signature_company: client.signature_company || "",
    signature_website: client.signature_website || "",
    signature_email: client.signature_email || "",
    signature_phone: client.signature_phone || "",
    signature_address: client.signature_address || "",
    signature_footer_note: client.signature_footer_note || "",
    portal_email: client.portal_email || client.contact_email || "",
    portal_password: "",
  };
}

export function formFromCampaign(campaign: Campaign) {
  return {
    client_id: campaign.client_id,
    bot_id: campaign.bot_id || "",
    name: campaign.name,
    target_industries: (campaign.target_industries || []).join(", "),
    target_locations: (campaign.target_locations || []).join(", "),
    offer_description: campaign.offer_description || "",
    client_business_description: campaign.client_business_description || "",
    promoted_service: campaign.promoted_service || "",
    value_proposition: campaign.value_proposition || "",
    target_customer_description: campaign.target_customer_description || "",
    target_audience_niche: campaign.target_audience_niche || "",
    decision_maker_roles: campaign.decision_maker_roles || "",
    target_business_model: campaign.target_business_model || "",
    target_company_stage: campaign.target_company_stage || "",
    target_price_segment: campaign.target_price_segment || "",
    exact_target_business_type: campaign.exact_target_business_type || "",
    target_business_activities: campaign.target_business_activities || "",
    target_company_size: campaign.target_company_size || "",
    required_online_signals: campaign.required_online_signals || "",
    lead_qualification_rules: campaign.lead_qualification_rules || "",
    lead_disqualification_rules: campaign.lead_disqualification_rules || "",
    sample_email_style: campaign.sample_email_style || "",
    must_have_signals: campaign.must_have_signals || "",
    excluded_company_types: campaign.excluded_company_types || "",
    search_keywords: campaign.search_keywords || "",
    negative_keywords: campaign.negative_keywords || "",
    preferred_lead_profile: campaign.preferred_lead_profile || "",
    customer_pain_points: campaign.customer_pain_points || "",
    avoid_in_messages: campaign.avoid_in_messages || "",
    call_to_action: campaign.call_to_action || "",
    bot_first_name: campaign.bot_first_name || "",
    bot_last_name: campaign.bot_last_name || "",
    bot_role: campaign.bot_role || "",
    signature_company: campaign.signature_company || "",
    signature_website: campaign.signature_website || "",
    signature_email: campaign.signature_email || "",
    signature_phone: campaign.signature_phone || "",
    signature_address: campaign.signature_address || "",
    signature_footer_note: campaign.signature_footer_note || "",
    daily_limit: campaign.daily_limit === null || campaign.daily_limit === undefined ? "" : String(campaign.daily_limit),
    warmup_daily_limits: Array.isArray(campaign.warmup_daily_limits) && campaign.warmup_daily_limits.length ? campaign.warmup_daily_limits.map((item) => String(item)) : (campaign.daily_limit === null || campaign.daily_limit === undefined ? [""] : [String(campaign.daily_limit)]),
    monthly_limit: campaign.monthly_limit ? String(campaign.monthly_limit) : "",
    min_score: String(campaign.min_score ?? 7),
    tone: campaign.tone || "",
    auto_run_enabled: campaign.auto_run_enabled !== false,
    auto_send_enabled: campaign.auto_send_enabled !== false,
    requires_approval_before_send: campaign.requires_approval_before_send === true,
    send_on_weekends: campaign.send_on_weekends === true,
    send_limit: campaign.send_limit === null || campaign.send_limit === undefined ? (campaign.daily_limit === null || campaign.daily_limit === undefined ? "" : String(campaign.daily_limit)) : String(campaign.send_limit),
    safety_daily_cap: campaign.safety_daily_cap === null || campaign.safety_daily_cap === undefined ? (campaign.daily_limit === null || campaign.daily_limit === undefined ? "" : String(campaign.daily_limit)) : String(campaign.safety_daily_cap),
    send_delay_min_seconds: "0",
    send_delay_max_seconds: "0",
    workday_start_hour: campaign.workday_start_hour === null || campaign.workday_start_hour === undefined ? "" : String(campaign.workday_start_hour),
    workday_end_hour: campaign.workday_end_hour === null || campaign.workday_end_hour === undefined ? "" : String(campaign.workday_end_hour),
    sending_timezone: campaign.sending_timezone || "Europe/Warsaw",
    stop_on_send_failures: String(campaign.stop_on_send_failures ?? 5),
    follow_up_delay_days: String(campaign.follow_up_delay_days ?? 2),
    max_follow_ups: String(campaign.max_follow_ups ?? 1),
    follow_ups_enabled: campaign.follow_ups_enabled === true,
    test_mode: campaign.test_mode === true,
    location_scope: campaign.location_scope || "poland",
    status: campaign.status,
  };
}

export function clientCampaignForm(clientId: string) {
  return { ...initialCampaignForm, client_id: clientId };
}

export const initialBotForm = {
  name: "",
  status: "active",
  provider: "openai",
  model: "gpt-5.5",
  max_parallel_campaigns: "1",
  api_key: "",
  api_key_action: "preserve",
  notes: "",
};

export function formFromBot(bot: Bot) {
  return {
    name: bot.name || "",
    status: bot.status || "active",
    provider: bot.provider || "openai",
    model: bot.model || "gpt-5.5",
    max_parallel_campaigns: String(bot.max_parallel_campaigns ?? 1),
    api_key: "",
    api_key_action: "preserve",
    notes: bot.notes || "",
  };
}

export function formFromLead(lead: Lead) {
  return {
    client_id: lead.client_id || "",
    campaign_id: lead.campaign_id || "",
    company_name: lead.company_name,
    industry: lead.industry || "",
    city: lead.city || "",
    phone: lead.phone || "",
    website: lead.website || "",
    email: lead.email || "",
    google_maps_url: lead.google_maps_url || "",
    source: lead.source || "manual",
    score: String(lead.score ?? 0),
    status: lead.status,
    main_problem: lead.main_problem || "",
    ai_summary: lead.ai_summary || "",
    generated_subject: lead.generated_subject || "",
    generated_email: lead.generated_email || "",
  };
}


export function formFromOrder(order: SignupOrder) {
  return {
    company_name: order.company_name || "",
    nip: order.nip || "",
    contact_name: order.contact_name || "",
    contact_email: order.contact_email || "",
    phone: order.phone || "",
    website: order.website || "",
    wants_vat_invoice: order.wants_vat_invoice === true,
    invoice_details: order.invoice_details || "",
    plan_id: order.plan_id || "starter",
    plan_name: order.plan_name || "",
    plan_price_pln: order.plan_price_pln === null ? "" : String(order.plan_price_pln),
    daily_emails: order.daily_emails === null ? "" : String(order.daily_emails),
    monthly_emails: order.monthly_emails === null ? "" : String(order.monthly_emails),
    location_scope: order.location_scope || "poland",
    selected_locations: (order.selected_locations || []).join(", "),
    target_industries: (order.target_industries || []).join(", "),
    company_description: order.company_description || "",
    promoted_service: order.promoted_service || "",
    value_proposition: order.value_proposition || "",
    target_customer_description: order.target_customer_description || "",
    target_audience_niche: order.target_audience_niche || "",
    decision_maker_roles: order.decision_maker_roles || "",
    target_business_model: order.target_business_model || "",
    target_company_stage: order.target_company_stage || "",
    target_price_segment: order.target_price_segment || "",
    exact_target_business_type: order.exact_target_business_type || "",
    target_business_activities: order.target_business_activities || "",
    target_company_size: order.target_company_size || "",
    required_online_signals: order.required_online_signals || "",
    lead_qualification_rules: order.lead_qualification_rules || "",
    lead_disqualification_rules: order.lead_disqualification_rules || "",
    sample_email_style: order.sample_email_style || "",
    must_have_signals: order.must_have_signals || "",
    excluded_company_types: order.excluded_company_types || "",
    search_keywords: order.search_keywords || "",
    negative_keywords: order.negative_keywords || "",
    preferred_lead_profile: order.preferred_lead_profile || "",
    customer_pain_points: order.customer_pain_points || "",
    avoid_in_messages: order.avoid_in_messages || "",
    call_to_action: order.call_to_action || "",
    tone: order.tone || "",
    bot_first_name: order.bot_first_name || "",
    bot_last_name: order.bot_last_name || "",
    bot_role: order.bot_role || "",
    signature_company: order.signature_company || "",
    signature_website: order.signature_website || "",
    signature_email: order.signature_email || "",
    signature_phone: order.signature_phone || "",
    signature_address: order.signature_address || "",
    signature_footer_note: order.signature_footer_note || "",
    smtp_host: order.smtp_host || "smtp.gmail.com",
    smtp_port: order.smtp_port === null ? "465" : String(order.smtp_port),
    smtp_secure: order.smtp_secure !== false,
    smtp_user: order.smtp_user || "",
    smtp_from: order.smtp_from || "",
    smtp_reply_to: order.smtp_reply_to || "",
    mailbox_setup_mode: order.mailbox_setup_mode || "fluxbase_setup",
    desired_mailbox_local_part: order.desired_mailbox_local_part || "",
    reply_destination_email: order.reply_destination_email || "",
    additional_mailbox_requested: Boolean(order.additional_mailbox_requested),
    additional_mailbox_price_pln: order.additional_mailbox_price_pln === null ? "0" : String(order.additional_mailbox_price_pln || 0),
    additional_mailbox_daily_emails: order.additional_mailbox_daily_emails === null ? "0" : String(order.additional_mailbox_daily_emails || 0),
    total_daily_emails: order.total_daily_emails === null ? String(order.daily_emails || 0) : String(order.total_daily_emails || order.daily_emails || 0),
    onboarding_step: order.onboarding_step === null ? "0" : String(order.onboarding_step || 0),
    onboarding_step_label: order.onboarding_step_label || "",
    onboarding_completed: Boolean(order.onboarding_completed),
    smtp_pass: "",
    smtp_pass_clear: false,
    stripe_checkout_session_id: order.stripe_checkout_session_id || "",
    stripe_customer_id: order.stripe_customer_id || "",
    stripe_subscription_id: order.stripe_subscription_id || "",
    stripe_payment_status: order.stripe_payment_status || "",
    stripe_price_id: order.stripe_price_id || "",
    stripe_product_id: order.stripe_product_id || "",
    paid_at: order.paid_at || "",
    payment_error: order.payment_error || "",
    converted_client_id: order.converted_client_id || "",
    converted_campaign_id: order.converted_campaign_id || "",
    status: order.status || "pending",
  };
}

export function applyPlanToOrderForm(form: typeof initialOrderEditForm, planId: string) {
  const plan = BOTSELLER_PLANS.find((item) => item.id === planId) || BOTSELLER_PLANS[0];
  const nextScope = getAllowedLocationScope(form.location_scope, plan.scope);
  return {
    ...form,
    plan_id: plan.id,
    plan_name: plan.name,
    plan_price_pln: String(plan.pricePln),
    daily_emails: String(plan.dailyEmails),
    monthly_emails: String(plan.monthlyEmails),
    location_scope: nextScope,
    selected_locations: getLocationsForScope(nextScope, form.selected_locations, plan.scope),
  };
}

export function generatePortalPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from({ length: 14 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Wystąpił błąd.";
}

export function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function WarmupScheduleFields({
  form,
  setForm,
}: {
  form: typeof initialCampaignForm;
  setForm: (form: typeof initialCampaignForm) => void;
}) {
  const limits = Array.isArray(form.warmup_daily_limits) && form.warmup_daily_limits.length ? form.warmup_daily_limits : [""];

  function updateLimit(index: number, value: string) {
    const next = [...limits];
    next[index] = value;
    const lastValue = [...next].reverse().find((item) => String(item).trim());
    setForm({ ...form, warmup_daily_limits: next, daily_limit: lastValue || "", send_limit: lastValue || "", safety_daily_cap: lastValue || "" });
  }

  function addLimit() {
    setForm({ ...form, warmup_daily_limits: [...limits, ""] });
  }

  function removeLimit(index: number) {
    const next = limits.filter((_, itemIndex) => itemIndex !== index);
    const safeNext = next.length ? next : [""];
    const lastValue = [...safeNext].reverse().find((item) => String(item).trim());
    setForm({ ...form, warmup_daily_limits: safeNext, daily_limit: lastValue || "", send_limit: lastValue || "", safety_daily_cap: lastValue || "" });
  }

  const parsed = campaignWarmupLimits({ ...form, warmup_daily_limits: limits });
  const target = parsed[parsed.length - 1] || 0;

  return (
    <div className="span warmup-builder">
      <div className="section-divider">Schedule warm-upu kampanii</div>
      <p className="field-help">Dodajesz tyle rubryk, ile chcesz. Każda rubryka to kolejny dzień kampanii. Ostatnia wartość zostaje jako stały limit dzienny po zakończeniu warm-upu.</p>
      <div className="warmup-grid">
        {limits.map((limit, index) => (
          <div className="warmup-row" key={`${index}-${limits.length}`}>
            <InputField
              label={`Dzień ${index + 1}`}
              value={limit}
              onChange={(value) => updateLimit(index, value)}
              inputMode="numeric"
              help={index === limits.length - 1 && target ? `Docelowo: ${target} maili dziennie` : undefined}
            />
            <button className="button ghost" type="button" onClick={() => removeLimit(index)} disabled={limits.length <= 1}>
              Usuń
            </button>
          </div>
        ))}
      </div>
      <button className="button" type="button" onClick={addLimit}>
        Dodaj dzień warm-upu
      </button>
    </div>
  );
}

export function CampaignSchedulePreview({ form, client }: { form: typeof initialCampaignForm; client?: ClientAccount | null }) {
  const info = campaignScheduleInfo(form, client);
  const clientDailyLimit = Number(client?.daily_email_limit || 0);
  const exceedsClientLimit = clientDailyLimit > 0 && info.rawDaily > clientDailyLimit;
  const highDailyLimit = info.rawDaily >= 80;
  return (
    <div className="schedule-preview span">
      <strong>Podgląd harmonogramu</strong>
      <div className="schedule-preview-grid">
        <span>Docelowo: <b>{info.rawDaily}</b> maili dziennie</span>
        <span>Okno: <b>{info.startHour !== null && info.endHour !== null ? `${String(info.startHour).padStart(2, "0")}:00-${String(info.endHour).padStart(2, "0")}:00` : "Brak konfiguracji"}</b></span>
        <span>Odstęp: <b>{info.interval ? `około co ${info.interval} min` : "Brak konfiguracji okna"}</b></span>
        <span>Strefa: <b>{info.timezone}</b></span>
        <span>Limit miesięczny: <b>{info.monthly.mode === "manual" ? `${info.monthly.limit} ręcznie` : `auto ok. ${info.monthly.total} / ${info.monthly.eligibleDays} dni`}</b></span>
      </div>
      <p>
        Bot szuka jednego leada w każdym cyklu cron i dodaje go do kolejki. Worker wysyła maile w rozłożeniu przez okno pracy. {form.test_mode ? "Tryb testowy ogranicza plan do maksymalnie 3 maili." : "Ręczne przerwy w sekundach są wyłączone, bo odstęp wynika z celu dziennego i okna pracy."}
      </p>
      <p>
        Warm-up kampanii: dzień {info.warmup.day}, dzisiejszy limit {info.warmup.limit || "brak"}/{info.rawDaily || "brak"}. Po ostatniej rubryce system trzyma {info.rawDaily || "brak"} maili dziennie.
      </p>
      {info.monthly.mode === "auto" ? (
        <p>Limit miesięczny jest automatyczny: system liczy realną liczbę dni w tym miesiącu ({info.monthly.days}) i {info.monthly.weekendsExcluded ? "odejmuje weekendy" : "uwzględnia weekendy"}.</p>
      ) : null}
      {exceedsClientLimit ? (
        <p className="schedule-warning">Limit kampanii przekracza limit klienta/planu ({clientDailyLimit}/dzień). Zapis potraktuj jako świadomy override administracyjny.</p>
      ) : null}
      {highDailyLimit ? (
        <p className="schedule-warning">Wysoki limit może obniżyć dostarczalność. Dla nowej skrzynki zalecany warm-up.</p>
      ) : null}
    </div>
  );
}


export function TargetSearchPrecisionFields({ form, setForm }: { form: any; setForm: (value: any) => void }) {
  const update = (key: string, value: string) => setForm({ ...form, [key]: value });
  return (
    <>
      <div className="span section-divider">Rozszerzone szukanie biznesów i grupa odbiorców</div>
      <TextAreaField
        label="Docelowa grupa odbiorców / nisza"
        value={form.target_audience_niche}
        onChange={(value) => update("target_audience_niche", value)}
        help="Najważniejsze pole zawężające. Opisz dokładnie, kogo bot ma szukać, np. lokalne restauracje premium bez nowoczesnej strony, gabinety fizjoterapii sportowej, firmy remontowe obsługujące klientów indywidualnych."
        span
      />
      <InputField
        label="Osoba decyzyjna"
        value={form.decision_maker_roles}
        onChange={(value) => update("decision_maker_roles", value)}
        placeholder="np. właściciel, manager, dyrektor sprzedaży, marketing manager"
        help="Bot użyje tego przy ocenie leada i treści maila, aby pisać do właściwej osoby po stronie firmy."
      />
      <SelectField label="Model biznesu targetu" value={form.target_business_model} onChange={(value) => update("target_business_model", value)}>
        <option value="">Dowolny</option>
        <option value="local_services">Lokalne usługi</option>
        <option value="b2b_services">Usługi B2B</option>
        <option value="b2c_services">Usługi B2C</option>
        <option value="ecommerce">E-commerce</option>
        <option value="production">Produkcja / przemysł</option>
        <option value="hospitality">HoReCa / lokale</option>
        <option value="medical_beauty">Medyczne / beauty</option>
        <option value="real_estate">Nieruchomości / budowlanka</option>
        <option value="other">Inny / mieszany</option>
      </SelectField>
      <InputField
        label="Etap rozwoju firmy"
        value={form.target_company_stage}
        onChange={(value) => update("target_company_stage", value)}
        placeholder="np. nowe firmy, firmy rozwijające sprzedaż, lokalne marki 3+ lata"
      />
      <InputField
        label="Segment cenowy / budżet targetu"
        value={form.target_price_segment}
        onChange={(value) => update("target_price_segment", value)}
        placeholder="np. premium, średni segment, firmy z budżetem marketingowym"
      />
      <TextAreaField label="Konkretny typ firm" value={form.exact_target_business_type} onChange={(value) => update("exact_target_business_type", value)} span />
      <TextAreaField label="Czym te firmy się zajmują?" value={form.target_business_activities} onChange={(value) => update("target_business_activities", value)} span />
      <InputField label="Wielkość firmy" value={form.target_company_size} onChange={(value) => update("target_company_size", value)} placeholder="np. lokalne firmy 2-30 osób" />
      <InputField label="Słowa kluczowe do wyszukiwania" value={form.search_keywords} onChange={(value) => update("search_keywords", value)} placeholder="np. restauracja włoska, pizza, catering" />
      <TextAreaField label="Sygnały, które firma powinna mieć" value={form.must_have_signals} onChange={(value) => update("must_have_signals", value)} span />
      <TextAreaField label="Sygnały online wymagane przy sprawdzaniu" value={form.required_online_signals} onChange={(value) => update("required_online_signals", value)} help="Np. ma stronę, słaba strona, brak formularza, brak social proof, dużo opinii Google, brak rezerwacji online." span />
      <TextAreaField label="Zasady kwalifikacji leada" value={form.lead_qualification_rules} onChange={(value) => update("lead_qualification_rules", value)} help="Twarde zasady, kiedy lead pasuje. Np. lokalna firma, aktywna strona, minimum 20 opinii, brak nowoczesnego formularza." span />
      <TextAreaField label="Jakich firm bot ma nie brać?" value={form.excluded_company_types} onChange={(value) => update("excluded_company_types", value)} span />
      <TextAreaField label="Zasady dyskwalifikacji leada" value={form.lead_disqualification_rules} onChange={(value) => update("lead_disqualification_rules", value)} help="Np. sieciówki, franczyzy, korporacje, marketplace, no-reply, firmy spoza branży, firmy bez żadnego maila kontaktowego." span />
      <InputField label="Słowa wykluczające" value={form.negative_keywords} onChange={(value) => update("negative_keywords", value)} placeholder="np. franczyza, sieć, galeria, korporacja" />
      <TextAreaField label="Idealny profil leada" value={form.preferred_lead_profile} onChange={(value) => update("preferred_lead_profile", value)} span />
      <TextAreaField label="Jakie firmy są najlepszym targetem?" value={form.target_customer_description} onChange={(value) => update("target_customer_description", value)} span />
      <TextAreaField label="Jakie problemy ma target?" value={form.customer_pain_points} onChange={(value) => update("customer_pain_points", value)} span />
    </>
  );
}

export function PersonaSignatureFields({ form, setForm }: { form: any; setForm: (value: any) => void }) {
  const update = (key: string, value: string) => setForm({ ...form, [key]: value });
  return (
    <>
      <div className="span section-divider">Persona bota i stopka mailowa</div>
      <InputField label="Imię bota" value={form.bot_first_name} onChange={(value) => update("bot_first_name", value)} placeholder="np. Jan" />
      <InputField label="Nazwisko bota" value={form.bot_last_name} onChange={(value) => update("bot_last_name", value)} placeholder="np. Kowalski" />
      <InputField label="Rola / stanowisko" value={form.bot_role} onChange={(value) => update("bot_role", value)} placeholder="np. Business Development Manager" />
      <InputField label="Firma w podpisie" value={form.signature_company} onChange={(value) => update("signature_company", value)} placeholder="np. FluxBase" />
      <InputField label="Strona w podpisie" value={form.signature_website} onChange={(value) => update("signature_website", value)} placeholder="https://firma.pl" />
      <InputField label="Email w podpisie" value={form.signature_email} onChange={(value) => update("signature_email", value)} type="email" />
      <InputField label="Telefon w podpisie" value={form.signature_phone} onChange={(value) => update("signature_phone", value)} />
      <InputField label="Adres firmy" value={form.signature_address} onChange={(value) => update("signature_address", value)} />
      <TextAreaField
        label="Krótka stopka prawna / RODO"
        value={form.signature_footer_note}
        onChange={(value) => update("signature_footer_note", value)}
        help="Opcjonalnie. Mailer doda podpis, dane nadawcy i delikatną stopkę informacyjną."
        span
      />
    </>
  );
}

export function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

export function FilterCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="filter-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function getAllowedLocationScope(scope: string, planScope?: string) {
  if (planScope === "europe") return scope === "europe_countries" ? "europe_countries" : "europe";
  if (planScope === "poland") return scope === "voivodeship" ? "voivodeship" : "poland";
  return scope || "poland";
}

export function getLocationsForScope(scope: string, selected: string, planScope?: string) {
  const safeScope = getAllowedLocationScope(scope, planScope);
  if (safeScope === "poland") return "Cała Polska";
  if (safeScope === "europe") return "Cała Europa";
  if (safeScope === "europe_countries") {
    return selected
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && item !== "Polska" && item !== "Cała Polska" && item !== "Cała Europa")
      .join(", ");
  }
  if (safeScope === "voivodeship" && ["Cała Polska", "Cała Europa"].includes(selected)) return "";
  if (safeScope === "custom" && ["Cała Polska", "Cała Europa"].includes(selected)) return "";
  return selected;
}

export function LocationPicker({
  scope,
  locations,
  onChange,
  span = true,
  planScope,
}: {
  scope: string;
  locations: string;
  onChange: (next: { location_scope: string; target_locations: string }) => void;
  span?: boolean;
  planScope?: string;
}) {
  const selected = locations
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const safeScope = getAllowedLocationScope(scope, planScope);

  function updateScope(nextScope: string) {
    const allowedScope = getAllowedLocationScope(nextScope, planScope);
    onChange({ location_scope: allowedScope, target_locations: getLocationsForScope(allowedScope, locations, planScope) });
  }

  function toggleVoivodeship(name: string, checked: boolean) {
    const next = checked ? Array.from(new Set([...selected, name])) : selected.filter((item) => item !== name);
    onChange({ location_scope: "voivodeship", target_locations: next.join(", ") });
  }

  function toggleEuropeCountry(name: string, checked: boolean) {
    const next = checked ? Array.from(new Set([...selected, name])) : selected.filter((item) => item !== name);
    onChange({ location_scope: "europe_countries", target_locations: next.join(", ") });
  }

  return (
    <div className={span ? "field span" : "field"}>
      <span>Lokalizacja kampanii</span>
      <select value={safeScope || "poland"} onChange={(event) => updateScope(event.target.value)}>
        {planScope === "europe" ? (
          <>
            <option value="europe">Cała Europa</option>
            <option value="europe_countries">Wybrane kraje Europy</option>
          </>
        ) : planScope === "poland" ? (
          <>
            <option value="poland">Cała Polska</option>
            <option value="voivodeship">Wybrane województwa</option>
          </>
        ) : (
          <>
            <option value="poland">Cała Polska</option>
            <option value="europe">Cała Europa</option>
            <option value="europe_countries">Wybrane kraje Europy</option>
            <option value="voivodeship">Wybrane województwa</option>
            <option value="custom">Własne miasta</option>
          </>
        )}
      </select>
      {safeScope === "europe_countries" ? (
        <div className="checkbox-grid">
          {EUROPE_COUNTRY_NAMES_FOR_EUROPE_PLAN.map((name) => (
            <label key={name} className="small-check">
              <input type="checkbox" checked={selected.includes(name)} onChange={(event) => toggleEuropeCountry(name, event.target.checked)} />
              <span>{name}</span>
            </label>
          ))}
        </div>
      ) : null}
      {safeScope === "voivodeship" ? (
        <div className="checkbox-grid">
          {VOIVODESHIP_NAMES.map((name) => (
            <label key={name} className="small-check">
              <input type="checkbox" checked={selected.includes(name)} onChange={(event) => toggleVoivodeship(name, event.target.checked)} />
              <span>{name}</span>
            </label>
          ))}
        </div>
      ) : null}
      {safeScope === "custom" ? (
        <input
          value={locations}
          onChange={(event) => onChange({ location_scope: "custom", target_locations: event.target.value })}
          placeholder="Warszawa, Kraków, Berlin"
        />
      ) : null}
      <small className="field-help">
        {safeScope === "poland" ? "Bot użyje listy miast z całej Polski." : null}
        {safeScope === "europe" ? "Bot użyje pełnej listy miast europejskich z podziałem na kraje poza Polską." : null}
        {safeScope === "europe_countries" ? "Zaznacz kraje. Bot rozwinie je na miasta większe, średnie i mniejsze." : null}
        {safeScope === "voivodeship" ? "Zaznacz województwa, w których bot ma szukać leadów." : null}
        {safeScope === "custom" ? "Wpisz miasta po przecinku, gdy kampania ma działać tylko w wybranych miejscach." : null}
      </small>
    </div>
  );
}

export function AttachmentPicker({
  files,
  onChange,
  label = "Załączniki kampanii",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
}) {
  return (
    <div className="field span attachment-picker">
      <span>{label}</span>
      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv"
        onChange={(event) => onChange(filesFromInput(event.target.files))}
      />
      <small className="field-help">Pliki będą automatycznie dołączane do każdego maila wysyłanego w tej kampanii. Maksymalnie 5 MB na plik.</small>
      {files.length ? (
        <div className="attachment-list compact">
          {files.map((file) => (
            <div className="attachment-row" key={`${file.name}-${file.size}-${file.lastModified}`}>
              <span>{file.name}</span>
              <strong>{formatFileSize(file.size)}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CampaignAttachmentList({
  attachments,
  onToggle,
  onDelete,
}: {
  attachments: CampaignAttachment[];
  onToggle: (attachment: CampaignAttachment) => void;
  onDelete: (attachment: CampaignAttachment) => void;
}) {
  if (!attachments.length) return <EmptyState>Brak załączników. Dodaj ofertę PDF, cennik, katalog albo prezentację przy kampanii.</EmptyState>;
  return (
    <div className="attachment-list">
      {attachments.map((attachment) => (
        <div className="attachment-row" key={attachment.id}>
          <div>
            <strong>{attachment.file_name}</strong>
            <span>{attachment.mime_type || "plik"} · {formatFileSize(attachment.file_size_bytes)} · {attachment.storage_path ? "Supabase Storage" : "legacy base64"} · {attachment.is_active ? "dołączany do maili" : "wyłączony"}</span>
          </div>
          <div className="row-actions">
            <button className="button small" type="button" onClick={() => onToggle(attachment)}>{attachment.is_active ? "Wyłącz" : "Włącz"}</button>
            <button className="button small danger" type="button" onClick={() => onDelete(attachment)}>Usuń</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GmailAppPasswordHelp() {
  return (
    <div className="helper-box span">
      <strong>Gdzie znaleźć SMTP pass do Gmaila?</strong>
      <ol>
        <li>Wejdź w konto Google, którego klient chce używać do wysyłki maili.</li>
        <li>Otwórz Bezpieczeństwo i włącz Weryfikację dwuetapową.</li>
        <li>Wejdź w Hasła do aplikacji albo bezpośrednio: myaccount.google.com/apppasswords.</li>
        <li>Utwórz hasło dla aplikacji o nazwie „FluxBase BotSeller”.</li>
        <li>Skopiuj 16-znakowe hasło i wklej je jako SMTP pass. Nie wpisuj zwykłego hasła do Gmaila.</li>
      </ol>
      <p>Jeżeli opcja nie jest widoczna, konto może być firmowe z blokadą administratora, mieć Advanced Protection albo nie mieć włączonej weryfikacji dwuetapowej.</p>
    </div>
  );
}


