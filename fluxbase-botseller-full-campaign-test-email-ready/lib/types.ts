export const SUBSCRIPTION_STATUSES = ["active", "paused", "cancel_requested", "cancelled"] as const;
export const CAMPAIGN_STATUSES = ["active", "paused", "cancelled"] as const;
export const CAMPAIGN_RUN_STATUSES = ["running", "completed", "failed", "partial"] as const;
export const BOT_STATUSES = ["active", "paused", "maintenance"] as const;
export const LOG_LEVELS = ["info", "warning", "error"] as const;
export const LEAD_STATUSES = [
  "new",
  "email_found",
  "email_missing",
  "draft_generated",
  "approved",
  "sent",
  "do_not_contact",
  "failed",
  "skipped_no_email",
] as const;
export const MESSAGE_STATUSES = [
  "draft",
  "queued",
  "sending",
  "sent",
  "delivered",
  "opened",
  "replied",
  "follow_up_scheduled",
  "follow_up_sent",
  "bounced",
  "spam",
  "failed",
  "skipped_no_email",
  "unsubscribed",
] as const;
export const SECRET_PROVIDERS = [
  "openai",
  "google_places",
  "google_search",
  "google_search_cx",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_from",
  "twilio",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type CampaignRunStatus = (typeof CAMPAIGN_RUN_STATUSES)[number];
export type BotStatus = (typeof BOT_STATUSES)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export type SecretProvider = (typeof SECRET_PROVIDERS)[number];

export type SenderPersonaFields = {
  bot_first_name: string | null;
  bot_last_name: string | null;
  bot_role: string | null;
  signature_company: string | null;
  signature_website: string | null;
  signature_email: string | null;
  signature_phone: string | null;
  signature_address: string | null;
  signature_footer_note: string | null;
};

export type Bot = {
  id: string;
  name: string;
  status: BotStatus;
  provider: string | null;
  model: string | null;
  notes: string | null;
  max_parallel_campaigns: number | null;
  api_key_last4: string | null;
  has_api_key?: boolean | null;
  created_at: string;
  campaigns?: Array<Pick<Campaign, "id" | "name" | "status">> | null;
};

export type ClientAccount = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  subscription_price: number | null;
  subscription_status: SubscriptionStatus;
  plan_id: string | null;
  plan_name: string | null;
  daily_email_limit: number | null;
  monthly_email_limit: number | null;
  warmup_enabled: boolean | null;
  warmup_started_at: string | null;
  warmup_stage_days: number | null;
  imap_host: string | null;
  imap_port: number | null;
  imap_secure: boolean | null;
  imap_user: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  notes: string | null;
  sender_name: string | null;
  sender_email: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
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
  smtp_pass_last4: string | null;
  portal_email: string | null;
  portal_password_last4: string | null;
  cancel_requested_at: string | null;
  cancel_reason: string | null;
  created_at: string;
};

export type Campaign = {
  id: string;
  client_id: string;
  bot_id: string | null;
  name: string;
  target_industries: string[] | null;
  target_locations: string[] | null;
  offer_description: string | null;
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
  daily_limit: number | null;
  warmup_daily_limits: number[] | null;
  monthly_limit: number | null;
  min_score: number | null;
  tone: string | null;
  auto_run_enabled: boolean | null;
  auto_send_enabled: boolean | null;
  requires_approval_before_send: boolean | null;
  send_on_weekends: boolean | null;
  send_limit: number | null;
  safety_daily_cap: number | null;
  send_delay_min_seconds: number | null;
  send_delay_max_seconds: number | null;
  workday_start_hour: number | null;
  workday_end_hour: number | null;
  sending_timezone: string | null;
  stop_on_send_failures: number | null;
  follow_up_delay_days: number | null;
  max_follow_ups: number | null;
  test_mode: boolean | null;
  location_scope: string | null;
  search_cursor: number | null;
  last_location_index: number | null;
  last_keyword_index: number | null;
  consecutive_send_failures: number | null;
  paused_reason: string | null;
  paused_at: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  locked_at: string | null;
  locked_by: string | null;
  status: CampaignStatus;
  created_at: string;
  client_accounts?: Pick<ClientAccount, "company_name"> | null;
};

export type Lead = {
  id: string;
  client_id: string | null;
  campaign_id: string | null;
  company_name: string;
  industry: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  google_maps_url: string | null;
  source: string | null;
  score: number | null;
  main_problem: string | null;
  ai_summary: string | null;
  generated_subject: string | null;
  generated_email: string | null;
  status: LeadStatus;
  created_at: string;
  client_accounts?: Pick<ClientAccount, "company_name"> | null;
  campaigns?: Pick<Campaign, "name"> | null;
};

export type CampaignRun = {
  id: string;
  client_id: string | null;
  campaign_id: string | null;
  status: CampaignRunStatus;
  started_at: string;
  finished_at: string | null;
  searched_queries: number | null;
  found_places: number | null;
  skipped_duplicates: number | null;
  inserted_leads: number | null;
  emails_found: number | null;
  drafts_created: number | null;
  sent_emails: number | null;
  send_failures: number | null;
  errors: string[] | null;
  campaigns?: Pick<Campaign, "name"> | null;
  client_accounts?: Pick<ClientAccount, "company_name"> | null;
};

export type RunLog = {
  id: string;
  run_id: string | null;
  client_id: string | null;
  campaign_id: string | null;
  lead_id: string | null;
  level: LogLevel;
  stage: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  campaigns?: Pick<Campaign, "name"> | null;
  client_accounts?: Pick<ClientAccount, "company_name"> | null;
};

export type SuppressionItem = {
  id: string;
  client_id: string | null;
  email: string | null;
  domain: string | null;
  company_name: string | null;
  reason: string | null;
  created_at: string;
  client_accounts?: Pick<ClientAccount, "company_name"> | null;
};

export type AuditLog = {
  id: string;
  actor_email: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type Message = {
  id: string;
  client_id: string | null;
  campaign_id: string | null;
  lead_id: string | null;
  subject: string | null;
  body: string | null;
  status: MessageStatus;
  approved_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  bounced_at: string | null;
  spam_at: string | null;
  failed_at: string | null;
  follow_up_due_at: string | null;
  follow_up_sent_at: string | null;
  follow_up_count: number | null;
  parent_message_id: string | null;
  sequence_step: number | null;
  tracking_id: string | null;
  provider_message_id: string | null;
  smtp_message_id: string | null;
  first_opened_at: string | null;
  last_opened_at: string | null;
  open_count: number | null;
  email_to: string | null;
  last_error: string | null;
  created_at: string;
  client_accounts?: Pick<ClientAccount, "company_name"> | null;
  campaigns?: Pick<Campaign, "name"> | null;
  leads?: Pick<Lead, "company_name"> | null;
};


export type CampaignAttachment = {
  id: string;
  client_id: string | null;
  campaign_id: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  storage_provider: string | null;
  is_active: boolean;
  created_at: string;
  campaigns?: Pick<Campaign, "name"> | null;
  client_accounts?: Pick<ClientAccount, "company_name"> | null;
};

export const CAMPAIGN_ATTACHMENT_SAFE_SELECT = [
  "id",
  "client_id",
  "campaign_id",
  "file_name",
  "mime_type",
  "file_size_bytes",
  "storage_bucket",
  "storage_path",
  "storage_provider",
  "is_active",
  "created_at",
].join(",");



export type SignupOrderAttachment = {
  id: string;
  order_id: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  storage_provider: string | null;
  is_active: boolean;
  created_at: string;
};

export const SIGNUP_ORDER_ATTACHMENT_SAFE_SELECT = [
  "id",
  "order_id",
  "file_name",
  "mime_type",
  "file_size_bytes",
  "storage_bucket",
  "storage_path",
  "storage_provider",
  "is_active",
  "created_at",
].join(",");

export type SignupOrder = {
  id: string;
  company_name: string;
  nip: string | null;
  contact_name: string | null;
  contact_email: string;
  phone: string | null;
  website: string | null;
  wants_vat_invoice: boolean | null;
  invoice_details: string | null;
  plan_id: string;
  plan_name: string | null;
  plan_price_pln: number | null;
  daily_emails: number | null;
  monthly_emails: number | null;
  location_scope: string | null;
  selected_locations: string[] | null;
  target_industries: string[] | null;
  company_description: string | null;
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
  tone: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  smtp_from: string | null;
  smtp_reply_to: string | null;
  smtp_pass_last4: string | null;
  smtp_pass_provided: boolean | null;
  mailbox_setup_mode: string | null;
  desired_mailbox_local_part: string | null;
  reply_destination_email: string | null;
  additional_mailbox_requested: boolean | null;
  additional_mailbox_price_pln: number | null;
  additional_mailbox_daily_emails: number | null;
  total_daily_emails: number | null;
  onboarding_step: number | null;
  onboarding_step_label: string | null;
  onboarding_completed: boolean | null;
  updated_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_payment_status: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  paid_at: string | null;
  payment_error: string | null;
  converted_client_id: string | null;
  converted_campaign_id: string | null;
  converted_at: string | null;
  status: string;
  created_at: string;
};

export type SendQueueItem = {
  id: string;
  client_id: string;
  campaign_id: string;
  scheduled_at: string;
  status: string;
  email_to: string;
  subject: string;
  kind: string | null;
  parent_message_id: string | null;
  lead_id: string | null;
  attempts: number | null;
  last_error: string | null;
  locked_at: string | null;
  processed_at: string | null;
  created_at: string;
  client_accounts?: Pick<ClientAccount, "company_name"> | null;
  campaigns?: Pick<Campaign, "name"> | null;
};

export type SendQueueSummary = {
  nextSendAt: string | null;
  todayTotal: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
};

export type CampaignUsageSummary = {
  sentToday: number;
  sentThisMonth: number;
  totalDailyTarget: number;
  totalMonthlyTarget: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  activeCampaignsWithLimits: number;
  campaignsMissingLimits: number;
};

export type PeriodStats = {
  leads: number;
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  bounced: number;
  spam: number;
  followUps: number;
};

export type PeriodTrends = Partial<Record<keyof PeriodStats, number | null>>;

export type ChartPoint = {
  label: string;
  value: number;
  secondary?: number;
};

export type SecretSummary = {
  id: string;
  provider: SecretProvider;
  label: string;
  value_last4: string | null;
  is_active: boolean;
  created_at: string;
};

export type AdminNotification = {
  id: string;
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  message: string;
  resource?: string | null;
  resourceId?: string | null;
  createdAt?: string | null;
  status?: "unread" | "read" | "resolved" | null;
};

export type AdminData = {
  bots: Bot[];
  clients: ClientAccount[];
  campaigns: Campaign[];
  leads: Lead[];
  messages: Message[];
  campaignRuns: CampaignRun[];
  runLogs: RunLog[];
  suppressionList: SuppressionItem[];
  auditLogs: AuditLog[];
  signupOrders: SignupOrder[];
  signupOrderAttachments: SignupOrderAttachment[];
  campaignAttachments: CampaignAttachment[];
  sendQueue: SendQueueItem[];
  sendQueueSummary: SendQueueSummary;
  usageSummary: CampaignUsageSummary;
  adminNotifications: AdminNotification[];
  dateRange?: { dateFrom: string; dateTo: string };
  chartData?: ChartPoint[];
  previousPeriodStats?: PeriodStats;
  trends?: PeriodTrends;
};

export type AdminResource = "bots" | "client_accounts" | "campaigns" | "leads" | "messages" | "suppression_list" | "send_queue" | "campaign_runs";

export const CLIENT_SAFE_SELECT = [
  "id",
  "company_name",
  "contact_name",
  "contact_email",
  "phone",
  "website",
  "subscription_price",
  "subscription_status",
  "plan_id",
  "plan_name",
  "daily_email_limit",
  "monthly_email_limit",
  "warmup_enabled",
  "warmup_started_at",
  "warmup_stage_days",
  "imap_host",
  "imap_port",
  "imap_secure",
  "imap_user",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_price_id",
  "notes",
  "sender_name",
  "sender_email",
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_user",
  "smtp_from",
  "smtp_reply_to",
  "dkim_selector",
  "bot_first_name",
  "bot_last_name",
  "bot_role",
  "signature_company",
  "signature_website",
  "signature_email",
  "signature_phone",
  "signature_address",
  "signature_footer_note",
  "smtp_pass_last4",
  "portal_email",
  "portal_password_last4",
  "cancel_requested_at",
  "cancel_reason",
  "created_at",
].join(",");
