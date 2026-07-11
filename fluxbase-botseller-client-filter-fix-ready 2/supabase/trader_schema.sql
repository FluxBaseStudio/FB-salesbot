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
