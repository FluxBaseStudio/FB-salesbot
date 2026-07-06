create extension if not exists pgcrypto;

create table if not exists client_accounts (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  contact_email text,
  phone text,
  website text,
  subscription_price numeric,
  subscription_status text not null default 'active',
  plan_id text,
  plan_name text,
  daily_email_limit int,
  monthly_email_limit int,
  warmup_enabled boolean not null default true,
  warmup_started_at timestamptz not null default now(),
  warmup_stage_days int not null default 1,
  imap_host text,
  imap_port int not null default 993,
  imap_secure boolean not null default true,
  imap_user text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  cancel_requested_at timestamptz,
  cancel_reason text,
  notes text,
  sender_name text,
  sender_email text,
  smtp_host text,
  smtp_port int,
  smtp_secure boolean not null default true,
  smtp_user text,
  smtp_from text,
  smtp_reply_to text,
  bot_first_name text,
  bot_last_name text,
  bot_role text,
  signature_company text,
  signature_website text,
  signature_email text,
  signature_phone text,
  signature_address text,
  signature_footer_note text,
  smtp_pass_encrypted text,
  smtp_pass_iv text,
  smtp_pass_auth_tag text,
  smtp_pass_last4 text,
  portal_email text unique,
  portal_password_hash text,
  portal_password_salt text,
  portal_password_last4 text,
  created_at timestamptz not null default now()
);

alter table client_accounts add column if not exists cancel_requested_at timestamptz;
alter table client_accounts add column if not exists cancel_reason text;
alter table client_accounts add column if not exists sender_name text;
alter table client_accounts add column if not exists sender_email text;
alter table client_accounts add column if not exists smtp_host text;
alter table client_accounts add column if not exists smtp_port int;
alter table client_accounts add column if not exists smtp_secure boolean not null default true;
alter table client_accounts add column if not exists smtp_user text;
alter table client_accounts add column if not exists smtp_from text;
alter table client_accounts add column if not exists smtp_reply_to text;
alter table client_accounts add column if not exists dkim_selector text;
alter table client_accounts add column if not exists bot_first_name text;
alter table client_accounts add column if not exists bot_last_name text;
alter table client_accounts add column if not exists bot_role text;
alter table client_accounts add column if not exists signature_company text;
alter table client_accounts add column if not exists signature_website text;
alter table client_accounts add column if not exists signature_email text;
alter table client_accounts add column if not exists signature_phone text;
alter table client_accounts add column if not exists signature_address text;
alter table client_accounts add column if not exists signature_footer_note text;
alter table client_accounts add column if not exists smtp_pass_encrypted text;
alter table client_accounts add column if not exists smtp_pass_iv text;
alter table client_accounts add column if not exists smtp_pass_auth_tag text;
alter table client_accounts add column if not exists smtp_pass_last4 text;
alter table client_accounts add column if not exists portal_email text unique;
alter table client_accounts add column if not exists portal_password_hash text;
alter table client_accounts add column if not exists portal_password_salt text;
alter table client_accounts add column if not exists portal_password_last4 text;
alter table client_accounts add column if not exists plan_id text;
alter table client_accounts add column if not exists plan_name text;
alter table client_accounts add column if not exists daily_email_limit int;
alter table client_accounts add column if not exists monthly_email_limit int;
alter table client_accounts add column if not exists warmup_enabled boolean not null default true;
alter table client_accounts add column if not exists warmup_started_at timestamptz not null default now();
alter table client_accounts add column if not exists warmup_stage_days int not null default 1;
alter table client_accounts alter column warmup_stage_days set default 1;
update client_accounts set warmup_stage_days = 1 where warmup_stage_days is null or warmup_stage_days = 7;
alter table client_accounts add column if not exists imap_host text;
alter table client_accounts add column if not exists imap_port int not null default 993;
alter table client_accounts add column if not exists imap_secure boolean not null default true;
alter table client_accounts add column if not exists imap_user text;
alter table client_accounts add column if not exists stripe_customer_id text;
alter table client_accounts add column if not exists stripe_subscription_id text;
alter table client_accounts add column if not exists stripe_price_id text;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references client_accounts(id) on delete cascade,
  name text not null,
  target_industries text[] not null default '{}',
  target_locations text[] not null default '{}',
  offer_description text,
  client_business_description text,
  promoted_service text,
  value_proposition text,
  target_customer_description text,
  target_audience_niche text,
  decision_maker_roles text,
  target_business_model text,
  target_company_stage text,
  target_price_segment text,
  exact_target_business_type text,
  target_business_activities text,
  target_company_size text,
  required_online_signals text,
  lead_qualification_rules text,
  lead_disqualification_rules text,
  sample_email_style text,
  must_have_signals text,
  excluded_company_types text,
  search_keywords text,
  negative_keywords text,
  preferred_lead_profile text,
  customer_pain_points text,
  avoid_in_messages text,
  call_to_action text,
  bot_first_name text,
  bot_last_name text,
  bot_role text,
  signature_company text,
  signature_website text,
  signature_email text,
  signature_phone text,
  signature_address text,
  signature_footer_note text,
  daily_limit int,
  monthly_limit int,
  min_score int not null default 7,
  tone text default 'Spokojny, konkretny, profesjonalny',
  auto_run_enabled boolean not null default true,
  auto_send_enabled boolean not null default true,
  send_limit int not null default 20,
  safety_daily_cap int,
  send_delay_min_seconds int not null default 30,
  send_delay_max_seconds int not null default 90,
  workday_start_hour int,
  workday_end_hour int,
  sending_timezone text,
  stop_on_send_failures int not null default 5,
  follow_up_delay_days int not null default 2,
  max_follow_ups int not null default 1,
  test_mode boolean not null default false,
  location_scope text default 'custom',
  search_cursor int not null default 0,
  last_location_index int not null default 0,
  last_keyword_index int not null default 0,
  consecutive_send_failures int not null default 0,
  paused_reason text,
  paused_at timestamptz,
  last_run_at timestamptz,
  next_run_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table campaigns add column if not exists client_business_description text;
alter table campaigns add column if not exists promoted_service text;
alter table campaigns add column if not exists value_proposition text;
alter table campaigns add column if not exists target_customer_description text;
alter table campaigns add column if not exists target_audience_niche text;
alter table campaigns add column if not exists decision_maker_roles text;
alter table campaigns add column if not exists target_business_model text;
alter table campaigns add column if not exists target_company_stage text;
alter table campaigns add column if not exists target_price_segment text;
alter table campaigns add column if not exists exact_target_business_type text;
alter table campaigns add column if not exists target_business_activities text;
alter table campaigns add column if not exists target_company_size text;
alter table campaigns add column if not exists required_online_signals text;
alter table campaigns add column if not exists lead_qualification_rules text;
alter table campaigns add column if not exists lead_disqualification_rules text;
alter table campaigns add column if not exists sample_email_style text;
alter table campaigns add column if not exists must_have_signals text;
alter table campaigns add column if not exists excluded_company_types text;
alter table campaigns add column if not exists search_keywords text;
alter table campaigns add column if not exists negative_keywords text;
alter table campaigns add column if not exists preferred_lead_profile text;
alter table campaigns add column if not exists customer_pain_points text;
alter table campaigns add column if not exists avoid_in_messages text;
alter table campaigns add column if not exists call_to_action text;
alter table campaigns add column if not exists bot_first_name text;
alter table campaigns add column if not exists bot_last_name text;
alter table campaigns add column if not exists bot_role text;
alter table campaigns add column if not exists signature_company text;
alter table campaigns add column if not exists signature_website text;
alter table campaigns add column if not exists signature_email text;
alter table campaigns add column if not exists signature_phone text;
alter table campaigns add column if not exists signature_address text;
alter table campaigns add column if not exists signature_footer_note text;
alter table campaigns add column if not exists daily_limit int;
alter table campaigns alter column daily_limit drop default;
alter table campaigns add column if not exists monthly_limit int;
alter table campaigns add column if not exists auto_run_enabled boolean not null default true;
alter table campaigns add column if not exists auto_send_enabled boolean not null default true;
alter table campaigns add column if not exists send_limit int not null default 20;
alter table campaigns add column if not exists safety_daily_cap int;
alter table campaigns alter column safety_daily_cap drop default;
alter table campaigns add column if not exists send_delay_min_seconds int not null default 30;
alter table campaigns add column if not exists send_delay_max_seconds int not null default 90;
alter table campaigns add column if not exists workday_start_hour int;
alter table campaigns alter column workday_start_hour drop default;
alter table campaigns add column if not exists workday_end_hour int;
alter table campaigns alter column workday_end_hour drop default;
alter table campaigns add column if not exists sending_timezone text;
alter table campaigns alter column sending_timezone drop default;
alter table campaigns add column if not exists stop_on_send_failures int not null default 5;
alter table campaigns add column if not exists follow_up_delay_days int not null default 2;
alter table campaigns add column if not exists max_follow_ups int not null default 1;
alter table campaigns add column if not exists test_mode boolean not null default false;
alter table campaigns add column if not exists location_scope text default 'custom';
alter table campaigns add column if not exists search_cursor int not null default 0;
alter table campaigns add column if not exists last_location_index int not null default 0;
alter table campaigns add column if not exists last_keyword_index int not null default 0;
alter table campaigns add column if not exists consecutive_send_failures int not null default 0;
alter table campaigns add column if not exists paused_reason text;
alter table campaigns add column if not exists paused_at timestamptz;
alter table campaigns add column if not exists last_run_at timestamptz;
alter table campaigns add column if not exists next_run_at timestamptz;
alter table campaigns add column if not exists locked_at timestamptz;
alter table campaigns add column if not exists locked_by text;

comment on column campaigns.send_limit is 'Deprecated: kept for backward compatibility. Current planner uses daily_limit.';
comment on column campaigns.safety_daily_cap is 'Deprecated: kept for backward compatibility. Current safety cap equals daily_limit/client plan limit.';
comment on column campaigns.send_delay_min_seconds is 'Deprecated: manual second-based sending delay is disabled. send_queue schedules messages across the work window.';
comment on column campaigns.send_delay_max_seconds is 'Deprecated: manual second-based sending delay is disabled. send_queue schedules messages across the work window.';


create table if not exists system_locks (
  name text primary key,
  locked_at timestamptz not null default now(),
  locked_by text not null,
  expires_at timestamptz not null
);

create index if not exists system_locks_expires_at_idx on system_locks(expires_at);

create table if not exists send_queue (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references client_accounts(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'pending',
  email_to text not null,
  subject text not null,
  body text not null,
  tracking_id uuid not null default gen_random_uuid(),
  lead_payload jsonb not null,
  generated_payload jsonb,
  kind text not null default 'initial',
  parent_message_id uuid,
  lead_id uuid,
  sequence_step int not null default 0,
  follow_up_count int not null default 0,
  attempts int not null default 0,
  last_error text,
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table send_queue add column if not exists generated_payload jsonb;
alter table send_queue add column if not exists kind text not null default 'initial';
alter table send_queue add column if not exists parent_message_id uuid;
alter table send_queue add column if not exists lead_id uuid;
alter table send_queue add column if not exists sequence_step int not null default 0;
alter table send_queue add column if not exists follow_up_count int not null default 0;
alter table send_queue add column if not exists attempts int not null default 0;
alter table send_queue add column if not exists last_error text;
alter table send_queue add column if not exists locked_at timestamptz;
alter table send_queue add column if not exists locked_by text;
alter table send_queue add column if not exists processed_at timestamptz;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client_accounts(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  company_name text not null,
  industry text,
  city text,
  phone text,
  website text,
  email text,
  google_maps_url text,
  source text default 'manual',
  score int not null default 0,
  main_problem text,
  ai_summary text,
  generated_subject text,
  generated_email text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client_accounts(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  lead_id uuid references leads(id) on delete cascade,
  subject text,
  body text,
  status text not null default 'draft',
  approved_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  spam_at timestamptz,
  failed_at timestamptz,
  follow_up_due_at timestamptz,
  follow_up_sent_at timestamptz,
  follow_up_count int not null default 0,
  parent_message_id uuid,
  sequence_step int not null default 0,
  tracking_id text unique,
  provider_message_id text,
  smtp_message_id text,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count int not null default 0,
  email_to text,
  last_error text,
  created_at timestamptz not null default now()
);

alter table messages add column if not exists delivered_at timestamptz;
alter table messages add column if not exists opened_at timestamptz;
alter table messages add column if not exists replied_at timestamptz;
alter table messages add column if not exists bounced_at timestamptz;
alter table messages add column if not exists spam_at timestamptz;
alter table messages add column if not exists failed_at timestamptz;
alter table messages add column if not exists follow_up_due_at timestamptz;
alter table messages add column if not exists follow_up_sent_at timestamptz;
alter table messages add column if not exists follow_up_count int not null default 0;
alter table messages add column if not exists parent_message_id uuid;
alter table messages add column if not exists sequence_step int not null default 0;
alter table messages add column if not exists tracking_id text unique;
alter table messages add column if not exists provider_message_id text;
alter table messages add column if not exists smtp_message_id text;
alter table messages add column if not exists first_opened_at timestamptz;
alter table messages add column if not exists last_opened_at timestamptz;
alter table messages add column if not exists open_count int not null default 0;
alter table messages add column if not exists email_to text;
alter table messages add column if not exists last_error text;



create table if not exists campaign_attachments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client_accounts(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  file_name text not null,
  mime_type text,
  file_size_bytes int not null,
  file_data_base64 text,
  storage_bucket text,
  storage_path text,
  storage_provider text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table campaign_attachments add column if not exists client_id uuid references client_accounts(id) on delete cascade;
alter table campaign_attachments add column if not exists campaign_id uuid references campaigns(id) on delete cascade;
alter table campaign_attachments add column if not exists file_name text;
alter table campaign_attachments add column if not exists mime_type text;
alter table campaign_attachments add column if not exists file_size_bytes int;
alter table campaign_attachments add column if not exists file_data_base64 text;
alter table campaign_attachments add column if not exists storage_bucket text;
alter table campaign_attachments add column if not exists storage_path text;
alter table campaign_attachments add column if not exists storage_provider text;
alter table campaign_attachments add column if not exists is_active boolean not null default true;
alter table campaign_attachments alter column file_data_base64 drop not null;

create table if not exists api_credentials (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  label text not null,
  encrypted_value text not null,
  iv text not null,
  auth_tag text not null,
  value_last4 text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists campaign_runs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client_accounts(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  searched_queries int not null default 0,
  found_places int not null default 0,
  skipped_duplicates int not null default 0,
  inserted_leads int not null default 0,
  emails_found int not null default 0,
  drafts_created int not null default 0,
  sent_emails int not null default 0,
  send_failures int not null default 0,
  errors text[] not null default '{}'
);

create table if not exists run_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references campaign_runs(id) on delete cascade,
  client_id uuid references client_accounts(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  lead_id uuid,
  level text not null default 'info',
  stage text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists suppression_list (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client_accounts(id) on delete cascade,
  email text,
  domain text,
  company_name text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  resource text,
  resource_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);


create table if not exists signup_orders (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  nip text,
  contact_name text,
  contact_email text not null,
  phone text,
  website text,
  wants_vat_invoice boolean not null default false,
  invoice_details text,
  plan_id text not null,
  plan_name text,
  plan_price_pln numeric,
  daily_emails int,
  monthly_emails int,
  location_scope text,
  selected_locations text[] not null default '{}',
  target_industries text[] not null default '{}',
  company_description text,
  promoted_service text,
  value_proposition text,
  target_customer_description text,
  target_audience_niche text,
  decision_maker_roles text,
  target_business_model text,
  target_company_stage text,
  target_price_segment text,
  exact_target_business_type text,
  target_business_activities text,
  target_company_size text,
  required_online_signals text,
  lead_qualification_rules text,
  lead_disqualification_rules text,
  sample_email_style text,
  must_have_signals text,
  excluded_company_types text,
  search_keywords text,
  negative_keywords text,
  preferred_lead_profile text,
  customer_pain_points text,
  avoid_in_messages text,
  call_to_action text,
  tone text,
  bot_first_name text,
  bot_last_name text,
  bot_role text,
  signature_company text,
  signature_website text,
  signature_email text,
  signature_phone text,
  signature_address text,
  signature_footer_note text,
  smtp_host text,
  smtp_port int,
  smtp_secure boolean not null default true,
  smtp_user text,
  smtp_from text,
  smtp_reply_to text,
  smtp_pass_encrypted text,
  smtp_pass_iv text,
  smtp_pass_auth_tag text,
  smtp_pass_last4 text,
  smtp_pass_provided boolean not null default false,
  stripe_checkout_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_status text,
  stripe_price_id text,
  stripe_product_id text,
  accepts_terms boolean not null default false,
  accepts_recurring_contract boolean not null default false,
  terms_accepted_at timestamptz,
  recurring_contract_accepted_at timestamptz,
  consent_ip text,
  consent_user_agent text,
  paid_at timestamptz,
  payment_error text,
  converted_client_id uuid references client_accounts(id) on delete set null,
  converted_campaign_id uuid references campaigns(id) on delete set null,
  converted_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table signup_orders add column if not exists monthly_emails int;
alter table signup_orders add column if not exists stripe_checkout_session_id text;
alter table signup_orders add column if not exists stripe_customer_id text;
alter table signup_orders add column if not exists stripe_subscription_id text;
alter table signup_orders add column if not exists stripe_payment_status text;
alter table signup_orders add column if not exists stripe_price_id text;
alter table signup_orders add column if not exists stripe_product_id text;
alter table signup_orders add column if not exists accepts_terms boolean not null default false;
alter table signup_orders add column if not exists accepts_recurring_contract boolean not null default false;
alter table signup_orders add column if not exists terms_accepted_at timestamptz;
alter table signup_orders add column if not exists recurring_contract_accepted_at timestamptz;
alter table signup_orders add column if not exists consent_ip text;
alter table signup_orders add column if not exists consent_user_agent text;
alter table signup_orders add column if not exists paid_at timestamptz;
alter table signup_orders add column if not exists payment_error text;
alter table signup_orders add column if not exists converted_client_id uuid references client_accounts(id) on delete set null;
alter table signup_orders add column if not exists converted_campaign_id uuid references campaigns(id) on delete set null;
alter table signup_orders add column if not exists converted_at timestamptz;
alter table signup_orders add column if not exists target_audience_niche text;
alter table signup_orders add column if not exists decision_maker_roles text;
alter table signup_orders add column if not exists target_business_model text;
alter table signup_orders add column if not exists target_company_stage text;
alter table signup_orders add column if not exists target_price_segment text;
alter table signup_orders add column if not exists exact_target_business_type text;
alter table signup_orders add column if not exists target_business_activities text;
alter table signup_orders add column if not exists target_company_size text;
alter table signup_orders add column if not exists required_online_signals text;
alter table signup_orders add column if not exists lead_qualification_rules text;
alter table signup_orders add column if not exists lead_disqualification_rules text;
alter table signup_orders add column if not exists sample_email_style text;
alter table signup_orders add column if not exists must_have_signals text;
alter table signup_orders add column if not exists excluded_company_types text;
alter table signup_orders add column if not exists search_keywords text;
alter table signup_orders add column if not exists negative_keywords text;
alter table signup_orders add column if not exists preferred_lead_profile text;
alter table signup_orders add column if not exists customer_pain_points text;
alter table signup_orders add column if not exists avoid_in_messages text;
alter table signup_orders add column if not exists call_to_action text;
alter table signup_orders add column if not exists tone text;
alter table signup_orders add column if not exists bot_first_name text;
alter table signup_orders add column if not exists bot_last_name text;
alter table signup_orders add column if not exists bot_role text;
alter table signup_orders add column if not exists signature_company text;
alter table signup_orders add column if not exists signature_website text;
alter table signup_orders add column if not exists signature_email text;
alter table signup_orders add column if not exists signature_phone text;
alter table signup_orders add column if not exists signature_address text;
alter table signup_orders add column if not exists signature_footer_note text;

alter table signup_orders add column if not exists mailbox_setup_mode text not null default 'fluxbase_setup';
alter table signup_orders add column if not exists desired_mailbox_local_part text;
alter table signup_orders add column if not exists reply_destination_email text;
alter table signup_orders add column if not exists additional_mailbox_requested boolean not null default false;
alter table signup_orders add column if not exists additional_mailbox_price_pln int not null default 0;
alter table signup_orders add column if not exists additional_mailbox_daily_emails int not null default 0;
alter table signup_orders add column if not exists total_daily_emails int;
alter table signup_orders add column if not exists onboarding_step int not null default 0;
alter table signup_orders add column if not exists onboarding_step_label text;
alter table signup_orders add column if not exists onboarding_completed boolean not null default false;
alter table signup_orders add column if not exists updated_at timestamptz not null default now();

create table if not exists client_sending_mailboxes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references client_accounts(id) on delete cascade,
  label text,
  smtp_host text not null default 'smtp.gmail.com',
  smtp_port int not null default 465,
  smtp_secure boolean not null default true,
  smtp_user text not null,
  smtp_from text,
  smtp_reply_to text,
  daily_email_limit int not null default 50,
  monthly_price_pln int not null default 599,
  stripe_subscription_item_id text,
  stripe_price_id text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists signup_order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references signup_orders(id) on delete cascade,
  file_name text not null,
  mime_type text,
  file_size_bytes int not null,
  storage_bucket text,
  storage_path text,
  storage_provider text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table signup_order_attachments add column if not exists order_id uuid references signup_orders(id) on delete cascade;
alter table signup_order_attachments add column if not exists file_name text;
alter table signup_order_attachments add column if not exists mime_type text;
alter table signup_order_attachments add column if not exists file_size_bytes int;
alter table signup_order_attachments add column if not exists storage_bucket text;
alter table signup_order_attachments add column if not exists storage_path text;
alter table signup_order_attachments add column if not exists storage_provider text;
alter table signup_order_attachments add column if not exists is_active boolean not null default true;

create table if not exists admin_notifications (
  id uuid primary key default gen_random_uuid(),
  tone text not null default 'info',
  title text not null,
  message text not null,
  resource text,
  resource_id uuid,
  status text not null default 'unread',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table admin_notifications add column if not exists tone text not null default 'info';
alter table admin_notifications add column if not exists title text;
alter table admin_notifications add column if not exists message text;
alter table admin_notifications add column if not exists resource text;
alter table admin_notifications add column if not exists resource_id uuid;
alter table admin_notifications add column if not exists status text not null default 'unread';
alter table admin_notifications add column if not exists resolved_at timestamptz;

-- Indexes
create unique index if not exists client_accounts_portal_email_unique on client_accounts(lower(portal_email)) where portal_email is not null;
create index if not exists campaigns_client_id_idx on campaigns(client_id);
create index if not exists campaigns_auto_run_idx on campaigns(auto_run_enabled, next_run_at);
create index if not exists campaigns_lock_idx on campaigns(locked_at);
create index if not exists campaigns_search_cursor_idx on campaigns(search_cursor, last_location_index, last_keyword_index);
create index if not exists leads_client_id_idx on leads(client_id);
create index if not exists leads_campaign_id_idx on leads(campaign_id);
create index if not exists leads_email_idx on leads(lower(email)) where email is not null;
create index if not exists leads_website_idx on leads(website) where website is not null;

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete set null,
  tracking_id text,
  provider text,
  provider_message_id text,
  event_type text not null,
  recipient text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table email_events add column if not exists message_id uuid references messages(id) on delete set null;
alter table email_events add column if not exists tracking_id text;
alter table email_events add column if not exists provider text;
alter table email_events add column if not exists provider_message_id text;
alter table email_events add column if not exists event_type text;
alter table email_events add column if not exists recipient text;
alter table email_events add column if not exists payload jsonb;

create index if not exists leads_visible_sent_idx on leads(client_id, campaign_id, created_at) where status = 'sent' and email is not null;
create index if not exists messages_client_id_idx on messages(client_id);
create index if not exists messages_campaign_id_idx on messages(campaign_id);
create index if not exists messages_lead_id_idx on messages(lead_id);
create index if not exists messages_tracking_id_idx on messages(tracking_id) where tracking_id is not null;
create index if not exists messages_provider_message_id_idx on messages(provider_message_id) where provider_message_id is not null;
create index if not exists messages_smtp_message_id_idx on messages(smtp_message_id) where smtp_message_id is not null;
create index if not exists messages_opened_idx on messages(first_opened_at, last_opened_at) where first_opened_at is not null;
create index if not exists email_events_tracking_idx on email_events(tracking_id, created_at);
create index if not exists email_events_message_id_idx on email_events(message_id, created_at);
create index if not exists email_events_provider_message_idx on email_events(provider_message_id);
create index if not exists messages_follow_up_due_idx on messages(follow_up_due_at) where follow_up_due_at is not null;
create index if not exists messages_sent_status_idx on messages(client_id, sent_at, status) where sent_at is not null;
create index if not exists send_queue_due_idx on send_queue(status, scheduled_at);
create index if not exists send_queue_client_due_idx on send_queue(client_id, scheduled_at);
create index if not exists send_queue_campaign_due_idx on send_queue(campaign_id, scheduled_at);
create index if not exists send_queue_processing_lock_idx on send_queue(status, locked_at) where status = 'processing';
create index if not exists send_queue_parent_message_idx on send_queue(parent_message_id) where parent_message_id is not null;
create index if not exists send_queue_lead_idx on send_queue(lead_id) where lead_id is not null;
create index if not exists send_queue_email_idx on send_queue(lower(email_to));

create index if not exists campaign_attachments_campaign_id_idx on campaign_attachments(campaign_id);
create index if not exists campaign_attachments_client_id_idx on campaign_attachments(client_id);
create index if not exists campaign_attachments_active_idx on campaign_attachments(campaign_id, is_active);
create index if not exists campaign_attachments_storage_path_idx on campaign_attachments(storage_path);
-- Bucket na załączniki kampanii. Pliki produkcyjnie trzymamy w Supabase Storage, nie w base64 w tabeli.
insert into storage.buckets (id, name, public, file_size_limit)
values ('campaign-attachments', 'campaign-attachments', false, 5242880)
on conflict (id) do nothing;


create index if not exists api_credentials_provider_idx on api_credentials(provider);
create index if not exists campaign_runs_campaign_id_idx on campaign_runs(campaign_id);
create index if not exists campaign_runs_client_id_idx on campaign_runs(client_id);
create index if not exists run_logs_run_id_idx on run_logs(run_id);
create index if not exists run_logs_campaign_id_idx on run_logs(campaign_id);
create index if not exists suppression_list_email_idx on suppression_list(lower(email)) where email is not null;
create index if not exists suppression_list_domain_idx on suppression_list(lower(domain)) where domain is not null;
create index if not exists suppression_list_company_idx on suppression_list(lower(company_name)) where company_name is not null;
create index if not exists audit_logs_created_at_idx on audit_logs(created_at);
create index if not exists signup_orders_created_at_idx on signup_orders(created_at);
create index if not exists signup_orders_status_idx on signup_orders(status);
create index if not exists signup_orders_stripe_session_idx on signup_orders(stripe_checkout_session_id);
create index if not exists signup_orders_stripe_subscription_idx on signup_orders(stripe_subscription_id);
create index if not exists signup_order_attachments_order_id_idx on signup_order_attachments(order_id);
create index if not exists signup_order_attachments_active_idx on signup_order_attachments(order_id, is_active);
create index if not exists signup_order_attachments_storage_path_idx on signup_order_attachments(storage_path);
create index if not exists client_accounts_stripe_subscription_idx on client_accounts(stripe_subscription_id);
create index if not exists admin_notifications_status_idx on admin_notifications(status, created_at);
create index if not exists admin_notifications_resource_idx on admin_notifications(resource, resource_id);

alter table client_accounts drop constraint if exists client_accounts_subscription_status_check;
alter table campaigns drop constraint if exists campaigns_status_check;
alter table leads drop constraint if exists leads_status_check;
alter table messages drop constraint if exists messages_status_check;
alter table api_credentials drop constraint if exists api_credentials_provider_check;
alter table campaign_runs drop constraint if exists campaign_runs_status_check;
alter table run_logs drop constraint if exists run_logs_level_check;
alter table signup_orders drop constraint if exists signup_orders_status_check;
alter table admin_notifications drop constraint if exists admin_notifications_status_check;
alter table admin_notifications drop constraint if exists admin_notifications_tone_check;
alter table send_queue drop constraint if exists send_queue_status_check;
alter table send_queue drop constraint if exists send_queue_kind_check;
alter table campaigns drop constraint if exists campaigns_workday_hours_check;
alter table campaigns drop constraint if exists campaigns_safety_daily_cap_check;
alter table campaigns drop constraint if exists campaigns_stop_on_send_failures_check;
alter table campaigns drop constraint if exists campaigns_follow_up_delay_days_check;
alter table campaigns drop constraint if exists campaigns_max_follow_ups_check;

alter table campaign_attachments drop constraint if exists campaign_attachments_file_name_not_empty;
alter table campaign_attachments drop constraint if exists campaign_attachments_file_size_check;
alter table signup_order_attachments drop constraint if exists signup_order_attachments_file_name_not_empty;
alter table signup_order_attachments drop constraint if exists signup_order_attachments_file_size_check;


do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'client_accounts_company_name_not_empty') then
    alter table client_accounts add constraint client_accounts_company_name_not_empty check (char_length(btrim(company_name)) > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'client_accounts_subscription_price_non_negative') then
    alter table client_accounts add constraint client_accounts_subscription_price_non_negative check (subscription_price is null or subscription_price >= 0);
  end if;
  alter table client_accounts add constraint client_accounts_subscription_status_check check (subscription_status in ('active', 'paused', 'cancel_requested', 'cancelled'));
  if not exists (select 1 from pg_constraint where conname = 'client_accounts_smtp_port_check') then
    alter table client_accounts add constraint client_accounts_smtp_port_check check (smtp_port is null or smtp_port between 1 and 65535);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'client_accounts_portal_email_format') then
    alter table client_accounts add constraint client_accounts_portal_email_format check (portal_email is null or portal_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_name_not_empty') then
    alter table campaigns add constraint campaigns_name_not_empty check (char_length(btrim(name)) > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_daily_limit_check') then
    alter table campaigns add constraint campaigns_daily_limit_check check (daily_limit between 1 and 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_monthly_limit_check') then
    alter table campaigns add constraint campaigns_monthly_limit_check check (monthly_limit is null or monthly_limit between 1 and 20000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_send_limit_check') then
    alter table campaigns add constraint campaigns_send_limit_check check (send_limit between 0 and 500);
  end if;
  alter table campaigns add constraint campaigns_safety_daily_cap_check check (safety_daily_cap between 1 and 500);
  alter table campaigns add constraint campaigns_stop_on_send_failures_check check (stop_on_send_failures between 1 and 50);
  alter table campaigns add constraint campaigns_follow_up_delay_days_check check (follow_up_delay_days between 1 and 30);
  alter table campaigns add constraint campaigns_max_follow_ups_check check (max_follow_ups between 0 and 5);
  alter table campaigns add constraint campaigns_workday_hours_check check (workday_start_hour between 0 and 23 and workday_end_hour between 1 and 24 and workday_end_hour > workday_start_hour);
  alter table send_queue add constraint send_queue_status_check check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled'));
  alter table send_queue add constraint send_queue_kind_check check (kind in ('initial', 'follow_up'));
  if not exists (select 1 from pg_constraint where conname = 'client_accounts_daily_email_limit_check') then
    alter table client_accounts add constraint client_accounts_daily_email_limit_check check (daily_email_limit is null or daily_email_limit between 1 and 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'client_accounts_monthly_email_limit_check') then
    alter table client_accounts add constraint client_accounts_monthly_email_limit_check check (monthly_email_limit is null or monthly_email_limit between 1 and 20000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'client_accounts_warmup_stage_days_check') then
    alter table client_accounts add constraint client_accounts_warmup_stage_days_check check (warmup_stage_days between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'client_accounts_imap_port_check') then
    alter table client_accounts add constraint client_accounts_imap_port_check check (imap_port between 1 and 65535);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_min_score_check') then
    alter table campaigns add constraint campaigns_min_score_check check (min_score between 0 and 10);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaign_attachments_file_name_not_empty') then
    alter table campaign_attachments add constraint campaign_attachments_file_name_not_empty check (char_length(btrim(file_name)) > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaign_attachments_file_size_check') then
    alter table campaign_attachments add constraint campaign_attachments_file_size_check check (file_size_bytes between 1 and 5242880);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'signup_order_attachments_file_name_not_empty') then
    alter table signup_order_attachments add constraint signup_order_attachments_file_name_not_empty check (char_length(btrim(file_name)) > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'signup_order_attachments_file_size_check') then
    alter table signup_order_attachments add constraint signup_order_attachments_file_size_check check (file_size_bytes between 1 and 5242880);
  end if;
  alter table campaigns add constraint campaigns_status_check check (status in ('active', 'paused', 'cancelled'));
  if not exists (select 1 from pg_constraint where conname = 'campaigns_send_delay_min_check') then
    alter table campaigns add constraint campaigns_send_delay_min_check check (send_delay_min_seconds between 0 and 3600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_send_delay_max_check') then
    alter table campaigns add constraint campaigns_send_delay_max_check check (send_delay_max_seconds between 0 and 3600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_company_name_not_empty') then
    alter table leads add constraint leads_company_name_not_empty check (char_length(btrim(company_name)) > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_score_check') then
    alter table leads add constraint leads_score_check check (score between 0 and 10);
  end if;
  alter table leads add constraint leads_status_check check (status in ('new', 'email_found', 'email_missing', 'draft_generated', 'approved', 'sent', 'do_not_contact', 'failed', 'skipped_no_email'));
  alter table messages add constraint messages_status_check check (status in ('draft', 'queued', 'sending', 'sent', 'delivered', 'opened', 'replied', 'follow_up_scheduled', 'follow_up_sent', 'bounced', 'spam', 'failed', 'skipped_no_email', 'unsubscribed'));
  alter table api_credentials add constraint api_credentials_provider_check check (provider in ('openai', 'google_places', 'google_search', 'google_search_cx', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'twilio'));
  alter table campaign_runs add constraint campaign_runs_status_check check (status in ('running', 'completed', 'failed', 'partial'));
  alter table run_logs add constraint run_logs_level_check check (level in ('info', 'warning', 'error'));
  alter table signup_orders add constraint signup_orders_status_check check (status in ('pending', 'pending_payment', 'paid', 'payment_failed', 'converted', 'rejected', 'cancelled'));
  alter table admin_notifications add constraint admin_notifications_status_check check (status in ('unread', 'read', 'resolved'));
  alter table admin_notifications add constraint admin_notifications_tone_check check (tone in ('info', 'warning', 'danger', 'success'));
end $$;

alter table client_accounts enable row level security;
alter table campaigns enable row level security;
alter table leads enable row level security;
alter table messages enable row level security;
alter table campaign_attachments enable row level security;
alter table api_credentials enable row level security;
alter table campaign_runs enable row level security;
alter table run_logs enable row level security;
alter table suppression_list enable row level security;
alter table audit_logs enable row level security;
alter table signup_orders enable row level security;
alter table signup_order_attachments enable row level security;
alter table send_queue enable row level security;
alter table admin_notifications enable row level security;

drop policy if exists "admin all client_accounts" on client_accounts;
drop policy if exists "admin all campaigns" on campaigns;
drop policy if exists "admin all leads" on leads;
drop policy if exists "admin all messages" on messages;
drop policy if exists "admin all campaign_attachments" on campaign_attachments;
drop policy if exists "admin all api_credentials" on api_credentials;
drop policy if exists "admin all campaign_runs" on campaign_runs;
drop policy if exists "admin all run_logs" on run_logs;
drop policy if exists "admin all suppression_list" on suppression_list;
drop policy if exists "admin all audit_logs" on audit_logs;
drop policy if exists "admin all signup_orders" on signup_orders;
drop policy if exists "admin all signup_order_attachments" on signup_order_attachments;
drop policy if exists "admin all send_queue" on send_queue;
drop policy if exists "admin all admin_notifications" on admin_notifications;

-- Brak polityk dla anon/authenticated jest celowy.
-- Panel używa Supabase Auth tylko do logowania, a dane odczytuje i zapisuje przez backend,
-- który sprawdza ADMIN_EMAILS i dopiero wtedy używa SUPABASE_SERVICE_ROLE_KEY.


-- BotSeller UI: po poprawnej wysyłce SMTP traktujemy wiadomość jako dostarczoną/przyjętą.
update messages
set delivered_at = coalesce(delivered_at, sent_at)
where sent_at is not null
  and delivered_at is null
  and status in ('sent', 'delivered', 'opened', 'replied', 'follow_up_sent');

-- 2026-07-04: multi-bot assignment, approval workflow, weekend toggle.
create table if not exists bots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  provider text default 'openai',
  model text default 'gpt-5.5',
  max_parallel_campaigns int not null default 1,
  notes text,
  created_at timestamptz not null default now()
);

alter table bots add column if not exists status text not null default 'active';
alter table bots add column if not exists provider text default 'openai';
alter table bots add column if not exists model text default 'gpt-5.5';
alter table bots add column if not exists max_parallel_campaigns int not null default 1;
alter table bots add column if not exists notes text;

alter table campaigns add column if not exists bot_id uuid references bots(id) on delete set null;
alter table campaigns add column if not exists requires_approval_before_send boolean not null default false;
alter table campaigns add column if not exists send_on_weekends boolean not null default false;

create index if not exists idx_campaigns_bot_id on campaigns(bot_id);
create index if not exists idx_messages_approval_client on messages(client_id, status, created_at);

comment on column campaigns.bot_id is 'Bot/worker przypisany do kampanii. Domyślnie 1 bot = 1 aktywna kampania.';
comment on column campaigns.requires_approval_before_send is 'Jeśli true, wiadomości trafiają jako szkice do panelu klienta i czekają na akceptację.';
comment on column campaigns.send_on_weekends is 'Jeśli true, planner i worker mogą działać w soboty/niedziele dla tej kampanii.';


-- 2026-07-04 release hardening: kampanie bez bota nie powinny startować automatycznie.
-- Kod aplikacji wymusza: aktywna kampania wymaga bot_id, a konwersja zamówienia tworzy kampanię jako paused.
-- Poniższe indeksy wspierają statusy operacyjne i widok kolejki.
create index if not exists idx_send_queue_approval_status on send_queue(client_id, status, scheduled_at) where status in ('awaiting_approval', 'pending', 'processing');
create index if not exists idx_campaigns_active_bot on campaigns(bot_id, status) where status = 'active';

-- 2026-07-04: per-bot API key encrypted storage.
alter table bots add column if not exists api_key_encrypted text;
alter table bots add column if not exists api_key_iv text;
alter table bots add column if not exists api_key_auth_tag text;
alter table bots add column if not exists api_key_last4 text;
alter table bots add column if not exists has_api_key boolean not null default false;

comment on column bots.api_key_encrypted is 'Zaszyfrowany API key przypisany do konkretnego bota. Nigdy nie jest zwracany do panelu.';
comment on column bots.api_key_last4 is 'Ostatnie 4 znaki API key do bezpiecznego rozpoznania w panelu.';
comment on column bots.has_api_key is 'Czy bot ma własny API key. Jeśli false, aplikacja używa globalnego OPENAI_API_KEY / sekretu openai.';


-- 2026-07-04: monthly limit can be manual or automatic.
-- NULL means: calculate monthly capacity from the real calendar month.
-- If send_on_weekends = false, Saturdays and Sundays are excluded from the automatic monthly capacity.
alter table campaigns alter column monthly_limit drop default;
alter table campaigns alter column monthly_limit drop not null;
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'campaigns_monthly_limit_check') then
    alter table campaigns drop constraint campaigns_monthly_limit_check;
  end if;
  alter table campaigns add constraint campaigns_monthly_limit_check check (monthly_limit is null or monthly_limit between 1 and 20000);
end $$;
comment on column campaigns.monthly_limit is 'Ręczny limit miesięczny kampanii. NULL = automatycznie według aktualnego miesiąca, warm-upu i ustawienia weekendów.';

-- Campaign-level warm-up schedule: admin wpisuje kolejne dzienne limity, np. [5,10,15,20,50].
alter table campaigns add column if not exists warmup_daily_limits jsonb;
update campaigns
set warmup_daily_limits = jsonb_build_array(daily_limit)
where warmup_daily_limits is null and daily_limit is not null;

alter table campaigns alter column daily_limit drop default;
alter table campaigns alter column workday_start_hour drop default;
alter table campaigns alter column workday_end_hour drop default;

comment on column campaigns.warmup_daily_limits is 'Kampanijny schedule warm-upu. Każda pozycja to limit na kolejny dzień kampanii; ostatnia wartość zostaje stałym dziennym limitem.';
