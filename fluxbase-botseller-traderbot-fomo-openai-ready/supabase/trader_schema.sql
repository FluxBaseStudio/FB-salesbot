create extension if not exists pgcrypto;

create table if not exists trader_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  trading_mode text not null default 'disabled',
  paper_enabled boolean not null default false,
  paper_initial_capital numeric(28,12) not null default 10000,
  paper_balance numeric(28,12) not null default 10000,
  max_entry_amount numeric(28,12) not null default 250,
  max_balance_percent_per_position numeric(10,4) not null default 5,
  max_daily_loss_amount numeric(28,12) not null default 250,
  max_daily_loss_percent numeric(10,4) not null default 5,
  max_open_positions int not null default 5,
  max_total_exposure numeric(28,12) not null default 2500,
  max_spread_percent numeric(10,4) not null default 1.5,
  max_slippage_percent numeric(10,4) not null default 0.75,
  min_volume_24h numeric(28,12) not null default 100000,
  min_liquidity numeric(28,12) not null default 0,
  default_stop_loss_percent numeric(10,4) not null default 6,
  trailing_stop_percent numeric(10,4) not null default 4,
  simulated_fee_percent numeric(10,4) not null default 0.1,
  loss_streak_cooldown_minutes int not null default 60,
  max_daily_trades int not null default 12,
  emergency_stop_active boolean not null default false,
  emergency_stop_used_at timestamptz,
  emergency_stop_used_by text,
  daily_loss_policy text not null default 'next_day',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trader_settings_trading_mode_check check (trading_mode in ('disabled', 'approval_required', 'automatic')),
  constraint trader_settings_daily_loss_policy_check check (daily_loss_policy in ('next_day', 'manual')),
  constraint trader_settings_positive_limits_check check (
    paper_initial_capital >= 0 and paper_balance >= 0 and max_entry_amount >= 0 and
    max_open_positions > 0 and max_daily_trades > 0
  )
);

create table if not exists trader_exchange_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  exchange_name text not null default 'binance_spot',
  label text not null default 'Binance Spot',
  api_key_encrypted text not null,
  api_key_iv text not null,
  api_key_auth_tag text not null,
  api_key_last4 text,
  api_secret_encrypted text not null,
  api_secret_iv text not null,
  api_secret_auth_tag text not null,
  api_secret_last4 text,
  api_passphrase_encrypted text,
  api_passphrase_iv text,
  api_passphrase_auth_tag text,
  api_passphrase_last4 text,
  sandbox boolean not null default false,
  is_active boolean not null default true,
  status text not null default 'not_tested',
  tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trader_exchange_name_check check (exchange_name in ('binance_spot')),
  constraint trader_exchange_status_check check (status in ('not_tested', 'connected', 'failed'))
);

create table if not exists trader_market_watchlist (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  exchange text not null,
  symbol text not null,
  pair text not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exchange, symbol)
);

create table if not exists trader_market_signals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  coin_name text not null,
  symbol text not null,
  pair text not null,
  exchange text not null,
  price numeric(28,12) not null,
  price_change_percent numeric(12,6) not null default 0,
  volume_24h numeric(28,12) not null default 0,
  liquidity numeric(28,12),
  spread_percent numeric(12,6) not null default 0,
  entry_min numeric(28,12) not null,
  entry_max numeric(28,12) not null,
  stop_loss numeric(28,12) not null,
  take_profit numeric(28,12) not null,
  risk_level text not null,
  confidence_score int not null default 0,
  rationale text not null,
  generated_at timestamptz not null default now(),
  valid_until timestamptz not null,
  status text not null,
  created_at timestamptz not null default now(),
  constraint trader_market_signals_status_check check (status in ('watch', 'buy', 'hold', 'sell', 'rejected')),
  constraint trader_market_signals_risk_check check (risk_level in ('low', 'medium', 'high', 'blocked')),
  constraint trader_market_signals_confidence_check check (confidence_score between 0 and 100)
);

create table if not exists trader_paper_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null default 'Default paper account',
  initial_balance numeric(28,12) not null default 10000,
  current_balance numeric(28,12) not null default 10000,
  realized_pnl numeric(28,12) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trader_positions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  signal_id uuid references trader_market_signals(id) on delete set null,
  paper_account_id uuid references trader_paper_accounts(id) on delete set null,
  symbol text not null,
  pair text not null,
  exchange text not null,
  side text not null,
  status text not null default 'open',
  entry_price numeric(28,12) not null,
  current_price numeric(28,12),
  exit_price numeric(28,12),
  quantity numeric(38,18) not null,
  entry_value numeric(28,12) not null,
  current_value numeric(28,12),
  realized_pnl numeric(28,12) not null default 0,
  unrealized_pnl numeric(28,12) not null default 0,
  realized_pnl_percent numeric(12,6) not null default 0,
  stop_loss numeric(28,12),
  take_profit numeric(28,12),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trader_positions_side_check check (side in ('buy', 'sell')),
  constraint trader_positions_status_check check (status in ('open', 'closed', 'cancelled'))
);

create table if not exists trader_approval_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  signal_id uuid references trader_market_signals(id) on delete set null,
  symbol text not null,
  pair text not null,
  exchange text not null,
  order_type text not null default 'market',
  side text not null,
  proposed_amount numeric(28,12) not null,
  current_price numeric(28,12) not null,
  stop_loss numeric(28,12),
  expected_slippage_percent numeric(12,6) not null default 0,
  rationale text not null,
  risk_level text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trader_approval_type_check check (order_type in ('market', 'limit')),
  constraint trader_approval_side_check check (side in ('buy', 'sell')),
  constraint trader_approval_status_check check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  constraint trader_approval_risk_check check (risk_level in ('low', 'medium', 'high', 'blocked'))
);

create table if not exists trader_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  approval_request_id uuid references trader_approval_requests(id) on delete set null,
  signal_id uuid references trader_market_signals(id) on delete set null,
  exchange text not null,
  symbol text not null,
  side text not null,
  type text not null default 'market',
  status text not null default 'proposed',
  amount numeric(28,12) not null,
  price numeric(28,12),
  idempotency_key text not null,
  exchange_order_id text,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trader_orders_side_check check (side in ('buy', 'sell')),
  constraint trader_orders_type_check check (type in ('market', 'limit')),
  constraint trader_orders_status_check check (status in ('proposed', 'pending', 'submitted', 'filled', 'cancelled', 'rejected', 'failed')),
  unique(idempotency_key)
);

create table if not exists trader_trades (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  position_id uuid references trader_positions(id) on delete set null,
  order_id uuid references trader_orders(id) on delete set null,
  symbol text not null,
  side text not null,
  price numeric(28,12) not null,
  quantity numeric(38,18) not null,
  fee numeric(28,12) not null default 0,
  slippage numeric(12,6) not null default 0,
  realized_pnl numeric(28,12),
  traded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint trader_trades_side_check check (side in ('buy', 'sell'))
);

create table if not exists trader_daily_risk (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  risk_date date not null,
  starting_equity numeric(28,12) not null default 0,
  realized_pnl numeric(28,12) not null default 0,
  daily_loss_limit_hit boolean not null default false,
  locked_until timestamptz,
  trades_count int not null default 0,
  loss_streak int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(risk_date)
);

create table if not exists trader_strategy_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  run_type text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  scanned_markets int not null default 0,
  generated_signals int not null default 0,
  opened_positions int not null default 0,
  closed_positions int not null default 0,
  errors text[] not null default '{}',
  metadata jsonb,
  constraint trader_strategy_runs_type_check check (run_type in ('market_scan', 'paper_engine', 'live_executor')),
  constraint trader_strategy_runs_status_check check (status in ('running', 'completed', 'failed', 'partial'))
);

create table if not exists trader_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource text,
  resource_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trader_settings_owner_idx on trader_settings(owner_id);
create index if not exists trader_exchange_active_idx on trader_exchange_connections(is_active, exchange_name);
create index if not exists trader_watchlist_active_idx on trader_market_watchlist(is_active, exchange, symbol);
create index if not exists trader_signals_generated_idx on trader_market_signals(generated_at desc);
create index if not exists trader_signals_symbol_idx on trader_market_signals(symbol, status, valid_until);
create index if not exists trader_positions_status_idx on trader_positions(status, symbol);
create index if not exists trader_positions_opened_idx on trader_positions(opened_at desc);
create index if not exists trader_orders_created_idx on trader_orders(created_at desc);
create index if not exists trader_orders_approval_idx on trader_orders(approval_request_id);
create index if not exists trader_trades_traded_idx on trader_trades(traded_at desc);
create index if not exists trader_approvals_status_idx on trader_approval_requests(status, expires_at);
create unique index if not exists trader_approvals_pending_signal_idx on trader_approval_requests(signal_id) where status = 'pending' and signal_id is not null;
create index if not exists trader_daily_risk_date_idx on trader_daily_risk(risk_date desc);
create index if not exists trader_strategy_runs_started_idx on trader_strategy_runs(started_at desc);
create index if not exists trader_audit_logs_created_idx on trader_audit_logs(created_at desc);

alter table trader_settings enable row level security;
alter table trader_exchange_connections enable row level security;
alter table trader_market_watchlist enable row level security;
alter table trader_market_signals enable row level security;
alter table trader_paper_accounts enable row level security;
alter table trader_positions enable row level security;
alter table trader_orders enable row level security;
alter table trader_trades enable row level security;
alter table trader_approval_requests enable row level security;
alter table trader_daily_risk enable row level security;
alter table trader_strategy_runs enable row level security;
alter table trader_audit_logs enable row level security;

-- Brak publicznych polityk jest celowy: TraderBot czyta i zapisuje dane przez endpointy Next.js,
-- które sprawdzają ADMIN_EMAILS i używają SUPABASE_SERVICE_ROLE_KEY po stronie serwera.

-- FOMO / copy-trading paper simulation update
alter table trader_settings add column if not exists copy_enabled boolean not null default false;
alter table trader_settings add column if not exists copy_position_amount numeric(28,12) not null default 100;
alter table trader_settings add column if not exists copy_min_source_score int not null default 70;
alter table trader_settings add column if not exists copy_min_confidence_score int not null default 65;
alter table trader_settings add column if not exists copy_max_signal_age_seconds int not null default 180;
alter table trader_settings add column if not exists copy_max_price_drift_percent numeric(10,4) not null default 2.5;

alter table trader_positions add column if not exists position_origin text not null default 'market_signal';
alter table trader_positions add column if not exists copy_source_id uuid;
alter table trader_positions add column if not exists copy_signal_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trader_positions_origin_check') then
    alter table trader_positions add constraint trader_positions_origin_check check (position_origin in ('market_signal', 'fomo_copy'));
  end if;
end $$;

create table if not exists trader_copy_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  platform text not null default 'fomo',
  display_name text not null,
  profile_reference text,
  wallet_address text,
  chain text not null default 'solana',
  source_score int not null default 70,
  win_rate_percent numeric(10,4) not null default 0,
  max_drawdown_percent numeric(10,4) not null default 0,
  observed_trades int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trader_copy_sources_platform_check check (platform in ('fomo')),
  constraint trader_copy_sources_score_check check (source_score between 0 and 100),
  constraint trader_copy_sources_observed_check check (observed_trades >= 0)
);

create table if not exists trader_copy_signals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  source_id uuid references trader_copy_sources(id) on delete set null,
  platform text not null default 'fomo',
  external_signal_id text,
  symbol text not null,
  pair text not null,
  chain text not null default 'solana',
  side text not null,
  source_price numeric(28,12) not null,
  observed_price numeric(28,12),
  current_price numeric(28,12),
  source_amount numeric(28,12),
  detected_at timestamptz not null,
  received_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source_score int not null default 0,
  confidence_score int not null default 0,
  price_drift_percent numeric(12,6) not null default 0,
  risk_level text not null default 'medium',
  status text not null default 'pending',
  rationale text not null default '',
  raw_payload jsonb,
  copied_position_id uuid references trader_positions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trader_copy_signals_platform_check check (platform in ('fomo')),
  constraint trader_copy_signals_side_check check (side in ('buy', 'sell')),
  constraint trader_copy_signals_status_check check (status in ('pending', 'qualified', 'copied', 'skipped', 'expired')),
  constraint trader_copy_signals_risk_check check (risk_level in ('low', 'medium', 'high', 'blocked')),
  constraint trader_copy_signals_source_score_check check (source_score between 0 and 100),
  constraint trader_copy_signals_confidence_check check (confidence_score between 0 and 100)
);

create unique index if not exists trader_copy_signals_external_idx
  on trader_copy_signals(platform, external_signal_id)
  where external_signal_id is not null;
create index if not exists trader_copy_sources_active_idx on trader_copy_sources(is_active, source_score desc);
create index if not exists trader_copy_signals_queue_idx on trader_copy_signals(status, expires_at, received_at);
create index if not exists trader_copy_signals_source_idx on trader_copy_signals(source_id, received_at desc);
create index if not exists trader_positions_copy_idx on trader_positions(position_origin, copy_source_id, status);

alter table trader_copy_sources enable row level security;
alter table trader_copy_signals enable row level security;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trader_positions_copy_source_fk') then
    alter table trader_positions
      add constraint trader_positions_copy_source_fk
      foreign key (copy_source_id) references trader_copy_sources(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trader_positions_copy_signal_fk') then
    alter table trader_positions
      add constraint trader_positions_copy_signal_fk
      foreign key (copy_signal_id) references trader_copy_signals(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trader_settings_copy_scores_check') then
    alter table trader_settings
      add constraint trader_settings_copy_scores_check
      check (
        copy_min_source_score between 0 and 100 and
        copy_min_confidence_score between 0 and 100 and
        copy_max_signal_age_seconds >= 15 and
        copy_position_amount > 0 and
        copy_max_price_drift_percent >= 0
      );
  end if;
end $$;

-- 2026-07-11: unified FOMO -> AI council -> market/testnet decision pipeline.
alter table trader_settings add column if not exists copy_require_ai_review boolean not null default true;
alter table trader_settings add column if not exists copy_min_ai_confidence_score int not null default 70;
alter table trader_settings add column if not exists copy_promote_to_live_proposals boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trader_settings_percentage_ranges_check') then
    alter table trader_settings add constraint trader_settings_percentage_ranges_check check (
      max_balance_percent_per_position between 0 and 100 and
      max_daily_loss_percent between 0 and 100 and
      max_spread_percent between 0 and 100 and
      max_slippage_percent between 0 and 100 and
      default_stop_loss_percent between 0 and 100 and
      trailing_stop_percent between 0 and 100 and
      simulated_fee_percent between 0 and 10 and
      copy_max_price_drift_percent between 0 and 100
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trader_settings_amount_ranges_check') then
    alter table trader_settings add constraint trader_settings_amount_ranges_check check (
      max_entry_amount >= 0 and max_daily_loss_amount >= 0 and
      max_total_exposure >= 0 and min_volume_24h >= 0 and
      min_liquidity >= 0 and copy_position_amount >= 0 and
      loss_streak_cooldown_minutes >= 0
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trader_settings_copy_ai_confidence_check') then
    alter table trader_settings add constraint trader_settings_copy_ai_confidence_check check (copy_min_ai_confidence_score between 0 and 100);
  end if;
end $$;

alter table trader_market_signals add column if not exists source_kind text not null default 'market_scan';
alter table trader_market_signals add column if not exists source_ref_id uuid;
alter table trader_market_signals add column if not exists priority int not null default 50;
alter table trader_market_signals add column if not exists ai_decision text;
alter table trader_market_signals add column if not exists ai_confidence_score int;
alter table trader_market_signals add column if not exists ai_summary text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trader_market_signals_source_kind_check') then
    alter table trader_market_signals add constraint trader_market_signals_source_kind_check check (source_kind in ('market_scan', 'fomo'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trader_market_signals_ai_decision_check') then
    alter table trader_market_signals add constraint trader_market_signals_ai_decision_check check (ai_decision is null or ai_decision in ('buy', 'watch', 'reject'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trader_market_signals_ai_confidence_check') then
    alter table trader_market_signals add constraint trader_market_signals_ai_confidence_check check (ai_confidence_score is null or ai_confidence_score between 0 and 100);
  end if;
end $$;

create index if not exists trader_market_signals_live_queue_idx
  on trader_market_signals(status, valid_until, priority desc, confidence_score desc, generated_at desc);
create unique index if not exists trader_market_signals_fomo_source_idx
  on trader_market_signals(source_kind, source_ref_id)
  where source_kind = 'fomo' and source_ref_id is not null;

alter table trader_copy_signals add column if not exists promoted_signal_id uuid references trader_market_signals(id) on delete set null;
alter table trader_copy_signals add column if not exists ai_decision text;
alter table trader_copy_signals add column if not exists ai_confidence_score int;
alter table trader_copy_signals add column if not exists ai_risk_level text;
alter table trader_copy_signals add column if not exists ai_rationale text;
alter table trader_copy_signals add column if not exists analyzed_at timestamptz;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'trader_copy_signals_status_check') then
    alter table trader_copy_signals drop constraint trader_copy_signals_status_check;
  end if;
  alter table trader_copy_signals add constraint trader_copy_signals_status_check check (status in ('pending', 'qualified', 'promoted', 'copied', 'skipped', 'expired'));
  if not exists (select 1 from pg_constraint where conname = 'trader_copy_signals_ai_decision_check') then
    alter table trader_copy_signals add constraint trader_copy_signals_ai_decision_check check (ai_decision is null or ai_decision in ('buy', 'watch', 'reject'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trader_copy_signals_ai_confidence_check') then
    alter table trader_copy_signals add constraint trader_copy_signals_ai_confidence_check check (ai_confidence_score is null or ai_confidence_score between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trader_copy_signals_ai_risk_check') then
    alter table trader_copy_signals add constraint trader_copy_signals_ai_risk_check check (ai_risk_level is null or ai_risk_level in ('low', 'medium', 'high', 'blocked'));
  end if;
end $$;

create table if not exists trader_ai_bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text not null default 'market_analyst',
  status text not null default 'active',
  model text not null default 'gpt-5.6-luna',
  instructions text not null default '',
  min_confidence_score int not null default 70,
  analyze_market boolean not null default true,
  analyze_fomo boolean not null default true,
  can_veto boolean not null default false,
  api_key_encrypted text,
  api_key_iv text,
  api_key_auth_tag text,
  api_key_last4 text,
  has_api_key boolean not null default false,
  last_tested_at timestamptz,
  last_test_status text not null default 'not_tested',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trader_ai_bots_role_check check (role in ('market_analyst', 'fomo_verifier', 'risk_guard', 'decision_reviewer')),
  constraint trader_ai_bots_status_check check (status in ('active', 'paused')),
  constraint trader_ai_bots_confidence_check check (min_confidence_score between 0 and 100),
  constraint trader_ai_bots_test_status_check check (last_test_status in ('not_tested', 'connected', 'failed'))
);

create table if not exists trader_ai_runs (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references trader_ai_bots(id) on delete set null,
  context_type text not null,
  context_id uuid,
  symbol text,
  decision text,
  confidence_score int,
  risk_level text,
  position_size_percent numeric(10,4),
  rationale text,
  warnings jsonb not null default '[]'::jsonb,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  status text not null default 'completed',
  error_message text,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  constraint trader_ai_runs_context_check check (context_type in ('market_signal', 'fomo_signal', 'test')),
  constraint trader_ai_runs_decision_check check (decision is null or decision in ('buy', 'watch', 'reject')),
  constraint trader_ai_runs_confidence_check check (confidence_score is null or confidence_score between 0 and 100),
  constraint trader_ai_runs_risk_check check (risk_level is null or risk_level in ('low', 'medium', 'high', 'blocked')),
  constraint trader_ai_runs_status_check check (status in ('completed', 'failed'))
);

create index if not exists trader_ai_bots_status_idx on trader_ai_bots(status, role, created_at);
create index if not exists trader_ai_runs_created_idx on trader_ai_runs(created_at desc);
create index if not exists trader_ai_runs_context_idx on trader_ai_runs(context_type, context_id, created_at desc);

alter table trader_ai_bots enable row level security;
alter table trader_ai_runs enable row level security;
