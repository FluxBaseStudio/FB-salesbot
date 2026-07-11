export const TRADER_TABS = [
  "market",
  "paper",
  "live",
  "approvals",
  "history",
  "settings",
  "exchange",
] as const;

export const TRADER_SIGNAL_STATUSES = ["watch", "buy", "hold", "sell", "rejected"] as const;
export const TRADER_RISK_LEVELS = ["low", "medium", "high", "blocked"] as const;
export const TRADER_TRADING_MODES = ["disabled", "approval_required", "automatic"] as const;
export const TRADER_APPROVAL_STATUSES = ["pending", "approved", "rejected", "expired", "cancelled"] as const;
export const TRADER_POSITION_STATUSES = ["open", "closed", "cancelled"] as const;
export const TRADER_ORDER_STATUSES = ["proposed", "pending", "submitted", "filled", "cancelled", "rejected", "failed"] as const;

export type TraderTab = (typeof TRADER_TABS)[number];
export type TraderSignalStatus = (typeof TRADER_SIGNAL_STATUSES)[number];
export type TraderRiskLevel = (typeof TRADER_RISK_LEVELS)[number];
export type TraderTradingMode = (typeof TRADER_TRADING_MODES)[number];
export type TraderApprovalStatus = (typeof TRADER_APPROVAL_STATUSES)[number];
export type TraderPositionStatus = (typeof TRADER_POSITION_STATUSES)[number];
export type TraderOrderStatus = (typeof TRADER_ORDER_STATUSES)[number];
export type TraderOrderSide = "buy" | "sell";
export type TraderOrderType = "market" | "limit";

export type Market = {
  exchange: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pair: string;
  status: string;
  minNotional?: string | null;
  tickSize?: string | null;
  stepSize?: string | null;
};

export type Ticker = {
  exchange: string;
  symbol: string;
  pair: string;
  price: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  bid: string;
  ask: string;
  spreadPercent: string;
  liquidity?: string | null;
  generatedAt: string;
};

export type Candle = {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export type Balance = {
  asset: string;
  free: string;
  locked: string;
};

export type CreateOrderInput = {
  symbol: string;
  side: TraderOrderSide;
  type: TraderOrderType;
  quantity?: string;
  quoteOrderQty?: string;
  price?: string;
  clientOrderId: string;
};

export type ExchangeOrder = {
  exchange: string;
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: TraderOrderSide;
  type: TraderOrderType;
  status: string;
  executedQty?: string | null;
  cummulativeQuoteQty?: string | null;
  raw?: unknown;
};

export interface ExchangeMarketProvider {
  getMarkets(): Promise<Market[]>;
  getTicker(symbol: string): Promise<Ticker>;
  getCandles(symbol: string, timeframe: string): Promise<Candle[]>;
  getBalance?(): Promise<Balance[]>;
  createOrder?(order: CreateOrderInput): Promise<ExchangeOrder>;
  cancelOrder?(orderId: string, symbol: string): Promise<void>;
}

export type TraderSettings = {
  id?: string;
  owner_id?: string | null;
  trading_mode: TraderTradingMode;
  paper_enabled: boolean;
  paper_initial_capital: string;
  paper_balance: string;
  max_entry_amount: string;
  max_balance_percent_per_position: string;
  max_daily_loss_amount: string;
  max_daily_loss_percent: string;
  max_open_positions: number;
  max_total_exposure: string;
  max_spread_percent: string;
  max_slippage_percent: string;
  min_volume_24h: string;
  min_liquidity: string;
  default_stop_loss_percent: string;
  trailing_stop_percent: string;
  simulated_fee_percent: string;
  loss_streak_cooldown_minutes: number;
  max_daily_trades: number;
  emergency_stop_active: boolean;
  emergency_stop_used_at?: string | null;
  emergency_stop_used_by?: string | null;
  daily_loss_policy: "next_day" | "manual";
  updated_at?: string | null;
};

export const TRADER_DEFAULT_SETTINGS: TraderSettings = {
  trading_mode: "disabled",
  paper_enabled: false,
  paper_initial_capital: "10000",
  paper_balance: "10000",
  max_entry_amount: "250",
  max_balance_percent_per_position: "5",
  max_daily_loss_amount: "250",
  max_daily_loss_percent: "5",
  max_open_positions: 5,
  max_total_exposure: "2500",
  max_spread_percent: "1.5",
  max_slippage_percent: "0.75",
  min_volume_24h: "100000",
  min_liquidity: "0",
  default_stop_loss_percent: "6",
  trailing_stop_percent: "4",
  simulated_fee_percent: "0.1",
  loss_streak_cooldown_minutes: 60,
  max_daily_trades: 12,
  emergency_stop_active: false,
  daily_loss_policy: "next_day",
};

export type TraderExchangeConnectionSummary = {
  id: string;
  exchange_name: string;
  label: string;
  api_key_last4: string | null;
  has_secret: boolean;
  sandbox: boolean;
  is_active: boolean;
  status: "not_tested" | "connected" | "failed";
  tested_at: string | null;
  created_at: string;
};

export type TraderMarketSignal = {
  id: string;
  coin_name: string;
  symbol: string;
  pair: string;
  exchange: string;
  price: string;
  price_change_percent: string;
  volume_24h: string;
  liquidity: string | null;
  spread_percent: string;
  entry_min: string;
  entry_max: string;
  stop_loss: string;
  take_profit: string;
  risk_level: TraderRiskLevel;
  confidence_score: number;
  rationale: string;
  generated_at: string;
  valid_until: string;
  status: TraderSignalStatus;
};

export type TraderPosition = {
  id: string;
  symbol: string;
  pair: string;
  exchange: string;
  side: TraderOrderSide;
  status: TraderPositionStatus;
  entry_price: string;
  current_price: string | null;
  exit_price: string | null;
  quantity: string;
  entry_value: string;
  current_value: string | null;
  realized_pnl: string;
  unrealized_pnl: string;
  realized_pnl_percent: string;
  stop_loss: string | null;
  take_profit: string | null;
  opened_at: string;
  closed_at: string | null;
};

export type TraderOrder = {
  id: string;
  exchange: string;
  symbol: string;
  side: TraderOrderSide;
  type: TraderOrderType;
  status: TraderOrderStatus;
  amount: string;
  price: string | null;
  idempotency_key: string;
  approval_request_id: string | null;
  exchange_order_id: string | null;
  created_at: string;
};

export type TraderTrade = {
  id: string;
  position_id: string | null;
  symbol: string;
  side: TraderOrderSide;
  price: string;
  quantity: string;
  fee: string;
  slippage: string;
  realized_pnl: string | null;
  traded_at: string;
};

export type TraderApprovalRequest = {
  id: string;
  signal_id: string | null;
  symbol: string;
  pair: string;
  exchange: string;
  order_type: TraderOrderType;
  side: TraderOrderSide;
  proposed_amount: string;
  current_price: string;
  stop_loss: string | null;
  expected_slippage_percent: string;
  rationale: string;
  risk_level: TraderRiskLevel;
  status: TraderApprovalStatus;
  expires_at: string;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
};

export type TraderDailyRisk = {
  id?: string;
  risk_date: string;
  starting_equity: string;
  realized_pnl: string;
  daily_loss_limit_hit: boolean;
  locked_until: string | null;
  trades_count: number;
  loss_streak: number;
};

export type TraderAuditLog = {
  id: string;
  actor_email: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  details: unknown;
  created_at: string;
};

export type TraderOverview = {
  schemaReady: boolean;
  schemaMessage?: string;
  liveTradingEnvEnabled: boolean;
  settings: TraderSettings;
  exchangeConnection: TraderExchangeConnectionSummary | null;
  signals: TraderMarketSignal[];
  positions: TraderPosition[];
  orders: TraderOrder[];
  trades: TraderTrade[];
  approvals: TraderApprovalRequest[];
  dailyRisk: TraderDailyRisk | null;
  auditLogs: TraderAuditLog[];
  balances: Balance[];
  metrics: {
    openPositions: number;
    closedPositions: number;
    realizedPnl: string;
    unrealizedPnl: string;
    winCount: number;
    lossCount: number;
    winRatePercent: string;
    maxDrawdown: string;
    totalBalance: string;
  };
};
