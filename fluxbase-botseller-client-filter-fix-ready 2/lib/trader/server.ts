import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/cryptoSecrets";
import { adminDb } from "@/lib/supabaseAdmin";
import { acquireSystemLock, releaseSystemLock } from "@/lib/bot/runLock";
import {
  calculatePaperClose,
  calculatePaperEntry,
  compareDecimal,
  createOrderIdempotencyKey,
  evaluateEntryRisk,
  evaluateLiveExecution,
  fromUnits,
  isApprovalExpired,
  toUnits,
} from "@/lib/trader/engine";
import { createMarketProvider } from "@/lib/trader/providers";
import { buildMarketSignal, scanMemecoinMarkets } from "@/lib/trader/strategy";
import type {
  Balance,
  Candle,
  TraderApprovalRequest,
  TraderAuditLog,
  TraderDailyRisk,
  TraderExchangeConnectionSummary,
  TraderMarketSignal,
  TraderOrder,
  TraderOverview,
  TraderPosition,
  TraderSettings,
  TraderTrade,
  TraderTradingMode,
} from "@/lib/trader/types";
import { TRADER_DEFAULT_SETTINGS, TRADER_TRADING_MODES } from "@/lib/trader/types";

const SELECT_CONNECTION_SUMMARY = "id,exchange_name,label,api_key_last4,api_secret_last4,sandbox,is_active,status,tested_at,created_at";

type Actor = { id: string; email?: string | null };
type DbError = { code?: string; message?: string };

type ConnectionSecrets = {
  id: string;
  exchange_name: string;
  sandbox: boolean;
  apiKey: string;
  apiSecret: string;
  apiPassphrase?: string | null;
  status: "not_tested" | "connected" | "failed";
};

function liveTradingEnvEnabled() {
  return process.env.LIVE_TRADING_ENABLED === "true";
}

function isMissingTraderSchema(error: unknown) {
  const dbError = error as DbError;
  return dbError?.code === "42P01" || String(dbError?.message || "").includes("trader_");
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function iso(date = new Date()) {
  return date.toISOString();
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function settingsFromRow(row: Partial<TraderSettings> | null | undefined): TraderSettings {
  return {
    ...TRADER_DEFAULT_SETTINGS,
    ...(row || {}),
    trading_mode: TRADER_TRADING_MODES.includes(row?.trading_mode as TraderTradingMode) ? row?.trading_mode as TraderTradingMode : TRADER_DEFAULT_SETTINGS.trading_mode,
    paper_enabled: Boolean(row?.paper_enabled ?? TRADER_DEFAULT_SETTINGS.paper_enabled),
    emergency_stop_active: Boolean(row?.emergency_stop_active ?? TRADER_DEFAULT_SETTINGS.emergency_stop_active),
    max_open_positions: Number(row?.max_open_positions ?? TRADER_DEFAULT_SETTINGS.max_open_positions),
    loss_streak_cooldown_minutes: Number(row?.loss_streak_cooldown_minutes ?? TRADER_DEFAULT_SETTINGS.loss_streak_cooldown_minutes),
    max_daily_trades: Number(row?.max_daily_trades ?? TRADER_DEFAULT_SETTINGS.max_daily_trades),
  };
}

function connectionSummary(row: Record<string, unknown> | null | undefined): TraderExchangeConnectionSummary | null {
  if (!row) return null;
  return {
    id: String(row.id),
    exchange_name: String(row.exchange_name || "binance_spot"),
    label: String(row.label || "Binance Spot"),
    api_key_last4: row.api_key_last4 ? String(row.api_key_last4) : null,
    has_secret: Boolean(row.api_secret_last4),
    sandbox: Boolean(row.sandbox),
    is_active: Boolean(row.is_active),
    status: row.status === "connected" || row.status === "failed" ? row.status : "not_tested",
    tested_at: row.tested_at ? String(row.tested_at) : null,
    created_at: String(row.created_at || iso()),
  };
}

function emptyOverview(message?: string): TraderOverview {
  return {
    schemaReady: !message,
    schemaMessage: message,
    liveTradingEnvEnabled: liveTradingEnvEnabled(),
    settings: TRADER_DEFAULT_SETTINGS,
    exchangeConnection: null,
    signals: [],
    positions: [],
    orders: [],
    trades: [],
    approvals: [],
    dailyRisk: null,
    auditLogs: [],
    balances: [],
    metrics: {
      openPositions: 0,
      closedPositions: 0,
      realizedPnl: "0",
      unrealizedPnl: "0",
      winCount: 0,
      lossCount: 0,
      winRatePercent: "0",
      maxDrawdown: "0",
      totalBalance: TRADER_DEFAULT_SETTINGS.paper_balance,
    },
  };
}

function cleanNumeric(value: unknown, fallback: string) {
  if (value === undefined || value === null || value === "") return fallback;
  try {
    return fromUnits(toUnits(String(value)));
  } catch {
    return fallback;
  }
}

function cleanInteger(value: unknown, fallback: number, min = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(Math.round(parsed), min) : fallback;
}

function settingsPatch(input: Record<string, unknown>, current: TraderSettings) {
  const patch: Partial<TraderSettings> = {};
  const numericFields = [
    "paper_initial_capital",
    "paper_balance",
    "max_entry_amount",
    "max_balance_percent_per_position",
    "max_daily_loss_amount",
    "max_daily_loss_percent",
    "max_total_exposure",
    "max_spread_percent",
    "max_slippage_percent",
    "min_volume_24h",
    "min_liquidity",
    "default_stop_loss_percent",
    "trailing_stop_percent",
    "simulated_fee_percent",
  ] as const;

  for (const field of numericFields) {
    if (field in input) patch[field] = cleanNumeric(input[field], current[field]);
  }
  if ("max_open_positions" in input) patch.max_open_positions = cleanInteger(input.max_open_positions, current.max_open_positions, 1);
  if ("loss_streak_cooldown_minutes" in input) patch.loss_streak_cooldown_minutes = cleanInteger(input.loss_streak_cooldown_minutes, current.loss_streak_cooldown_minutes, 0);
  if ("max_daily_trades" in input) patch.max_daily_trades = cleanInteger(input.max_daily_trades, current.max_daily_trades, 1);
  if ("paper_enabled" in input) patch.paper_enabled = input.paper_enabled === true;
  if ("daily_loss_policy" in input) patch.daily_loss_policy = input.daily_loss_policy === "manual" ? "manual" : "next_day";
  if ("trading_mode" in input && TRADER_TRADING_MODES.includes(input.trading_mode as TraderTradingMode)) patch.trading_mode = input.trading_mode as TraderTradingMode;
  patch.updated_at = iso();
  return patch;
}

async function audit(actor: Actor | null, action: string, resource: string, resourceId?: string | null, details?: unknown) {
  const { error } = await adminDb().from("trader_audit_logs").insert({
    actor_id: actor?.id || null,
    actor_email: actor?.email || null,
    action,
    resource,
    resource_id: resourceId || null,
    details: details || null,
  });
  if (error) console.error("trader audit failed", error.message);
}

async function getSettings(actor?: Actor | null) {
  const db = adminDb();
  const { data, error } = await db
    .from("trader_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return settingsFromRow(data as Partial<TraderSettings>);

  const { data: inserted, error: insertError } = await db
    .from("trader_settings")
    .insert({ ...TRADER_DEFAULT_SETTINGS, owner_id: actor?.id || null })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return settingsFromRow(inserted as Partial<TraderSettings>);
}

async function getActiveConnectionSummary() {
  const { data, error } = await adminDb()
    .from("trader_exchange_connections")
    .select(SELECT_CONNECTION_SUMMARY)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return connectionSummary(data as Record<string, unknown> | null);
}

function decryptColumn(row: Record<string, unknown>, prefix: string) {
  const encrypted = row[`${prefix}_encrypted`];
  const iv = row[`${prefix}_iv`];
  const authTag = row[`${prefix}_auth_tag`];
  if (!encrypted || !iv || !authTag) return null;
  return decryptSecret({
    encrypted_value: String(encrypted),
    iv: String(iv),
    auth_tag: String(authTag),
  });
}

async function getActiveConnectionSecrets(): Promise<ConnectionSecrets | null> {
  const { data, error } = await adminDb()
    .from("trader_exchange_connections")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const apiKey = decryptColumn(row, "api_key");
  const apiSecret = decryptColumn(row, "api_secret");
  if (!apiKey || !apiSecret) return null;
  return {
    id: String(row.id),
    exchange_name: String(row.exchange_name || "binance_spot"),
    sandbox: Boolean(row.sandbox),
    apiKey,
    apiSecret,
    apiPassphrase: decryptColumn(row, "api_passphrase"),
    status: row.status === "connected" || row.status === "failed" ? row.status : "not_tested",
  };
}

async function providerWithOptionalSecrets() {
  const connection = await getActiveConnectionSecrets().catch(() => null);
  if (!connection) return createMarketProvider();
  return createMarketProvider({
    exchangeName: connection.exchange_name,
    apiKey: connection.apiKey,
    apiSecret: connection.apiSecret,
    sandbox: connection.sandbox,
  });
}

function calculateMetrics(settings: TraderSettings, positions: TraderPosition[]) {
  const open = positions.filter((position) => position.status === "open");
  const closed = positions.filter((position) => position.status === "closed");
  const realized = positions.reduce((sum, position) => sum + toUnits(position.realized_pnl || "0"), 0n);
  const unrealized = open.reduce((sum, position) => sum + toUnits(position.unrealized_pnl || "0"), 0n);
  const winCount = closed.filter((position) => compareDecimal(position.realized_pnl, "0") > 0).length;
  const lossCount = closed.filter((position) => compareDecimal(position.realized_pnl, "0") < 0).length;
  const totalClosed = winCount + lossCount;
  const totalBalance = fromUnits(toUnits(settings.paper_balance) + unrealized);
  let peak = toUnits(settings.paper_initial_capital);
  let maxDrawdown = 0n;
  let equity = toUnits(settings.paper_initial_capital);
  for (const position of closed.sort((a, b) => a.closed_at?.localeCompare(b.closed_at || "") || 0)) {
    equity += toUnits(position.realized_pnl || "0");
    if (equity > peak) peak = equity;
    const drawdown = peak - equity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return {
    openPositions: open.length,
    closedPositions: closed.length,
    realizedPnl: fromUnits(realized),
    unrealizedPnl: fromUnits(unrealized),
    winCount,
    lossCount,
    winRatePercent: totalClosed ? fromUnits((BigInt(winCount) * 100n * 100000000n) / BigInt(totalClosed)) : "0",
    maxDrawdown: fromUnits(maxDrawdown),
    totalBalance,
  };
}

async function getDailyRisk(settings: TraderSettings) {
  const db = adminDb();
  const riskDate = todayKey();
  const { data, error } = await db.from("trader_daily_risk").select("*").eq("risk_date", riskDate).limit(1).maybeSingle();
  if (error) throw error;
  if (data) return data as TraderDailyRisk;
  const { data: inserted, error: insertError } = await db.from("trader_daily_risk").insert({
    risk_date: riskDate,
    starting_equity: settings.paper_balance,
    realized_pnl: "0",
    daily_loss_limit_hit: false,
    locked_until: null,
    trades_count: 0,
    loss_streak: 0,
  }).select("*").single();
  if (insertError) throw insertError;
  return inserted as TraderDailyRisk;
}

async function riskSnapshot(settings: TraderSettings) {
  const [positions, dailyRisk] = await Promise.all([
    adminDb().from("trader_positions").select("*").eq("status", "open"),
    getDailyRisk(settings),
  ]);
  if (positions.error) throw positions.error;
  const openPositions = (positions.data || []) as TraderPosition[];
  const currentExposure = openPositions.reduce((sum, position) => sum + toUnits(position.entry_value || "0"), 0n);
  return { openPositions, currentExposure: fromUnits(currentExposure), dailyRisk };
}

export async function getTraderOverview(actor?: Actor | null): Promise<TraderOverview> {
  try {
    const settings = await getSettings(actor);
    const db = adminDb();
    const [
      exchangeConnection,
      signals,
      positions,
      orders,
      trades,
      approvals,
      dailyRisk,
      auditLogs,
    ] = await Promise.all([
      getActiveConnectionSummary(),
      db.from("trader_market_signals").select("*").order("generated_at", { ascending: false }).limit(50),
      db.from("trader_positions").select("*").order("opened_at", { ascending: false }).limit(80),
      db.from("trader_orders").select("*").order("created_at", { ascending: false }).limit(80),
      db.from("trader_trades").select("*").order("traded_at", { ascending: false }).limit(80),
      db.from("trader_approval_requests").select("*").order("created_at", { ascending: false }).limit(80),
      getDailyRisk(settings),
      db.from("trader_audit_logs").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    for (const result of [signals, positions, orders, trades, approvals, auditLogs]) {
      if ("error" in result && result.error) throw result.error;
    }

    const positionRows = (positions.data || []) as TraderPosition[];
    let balances: Balance[] = [];
    const connection = await getActiveConnectionSecrets().catch(() => null);
    if (connection?.status === "connected") {
      const provider = createMarketProvider({ exchangeName: connection.exchange_name, apiKey: connection.apiKey, apiSecret: connection.apiSecret, sandbox: connection.sandbox });
      balances = await provider.getBalance?.().catch(() => []) || [];
    }

    return {
      schemaReady: true,
      liveTradingEnvEnabled: liveTradingEnvEnabled(),
      settings,
      exchangeConnection,
      signals: (signals.data || []) as TraderMarketSignal[],
      positions: positionRows,
      orders: (orders.data || []) as TraderOrder[],
      trades: (trades.data || []) as TraderTrade[],
      approvals: (approvals.data || []) as TraderApprovalRequest[],
      dailyRisk,
      auditLogs: (auditLogs.data || []) as TraderAuditLog[],
      balances,
      metrics: calculateMetrics(settings, positionRows),
    };
  } catch (error) {
    if (isMissingTraderSchema(error)) return emptyOverview("Migracja supabase/trader_schema.sql nie zostala jeszcze uruchomiona.");
    throw error;
  }
}

export async function saveTraderSettings(actor: Actor, input: Record<string, unknown>) {
  const current = await getSettings(actor);
  const patch = settingsPatch(input, current);
  const { data, error } = await adminDb()
    .from("trader_settings")
    .update(patch)
    .eq("id", current.id)
    .select("*")
    .single();
  if (error) throw error;
  await audit(actor, "trader_settings_updated", "trader_settings", current.id, { fields: Object.keys(patch) });
  return settingsFromRow(data as Partial<TraderSettings>);
}

function encryptedColumns(prefix: string, value: string | null | undefined) {
  if (!value) {
    return {
      [`${prefix}_encrypted`]: null,
      [`${prefix}_iv`]: null,
      [`${prefix}_auth_tag`]: null,
      [`${prefix}_last4`]: null,
    };
  }
  const encrypted = encryptSecret(value);
  return {
    [`${prefix}_encrypted`]: encrypted.encrypted_value,
    [`${prefix}_iv`]: encrypted.iv,
    [`${prefix}_auth_tag`]: encrypted.auth_tag,
    [`${prefix}_last4`]: encrypted.value_last4,
  };
}

export async function connectExchange(actor: Actor, input: Record<string, unknown>) {
  for (const forbidden of ["login", "password", "seed", "seed_phrase", "private_key", "mnemonic"]) {
    if (forbidden in input) throw new Error("TraderBot nie przyjmuje loginow, hasel, seed phrase ani prywatnych kluczy portfela.");
  }
  const exchangeName = String(input.exchange_name || "binance_spot");
  if (exchangeName !== "binance_spot") throw new Error("Pierwsza wersja obsluguje Binance Spot.");
  const apiKey = String(input.api_key || "").trim();
  const apiSecret = String(input.api_secret || "").trim();
  const passphrase = String(input.api_passphrase || "").trim();
  if (!apiKey || !apiSecret) throw new Error("Podaj API key i API secret gieldy.");

  const db = adminDb();
  await db.from("trader_exchange_connections").update({ is_active: false }).eq("is_active", true);
  const payload = {
    owner_id: actor.id,
    exchange_name: exchangeName,
    label: String(input.label || "Binance Spot"),
    sandbox: input.sandbox === true,
    is_active: true,
    status: "not_tested",
    ...encryptedColumns("api_key", apiKey),
    ...encryptedColumns("api_secret", apiSecret),
    ...encryptedColumns("api_passphrase", passphrase || null),
  };
  const { data, error } = await db.from("trader_exchange_connections").insert(payload).select(SELECT_CONNECTION_SUMMARY).single();
  if (error) throw error;
  await audit(actor, "trader_exchange_connected", "trader_exchange_connections", String(data.id), { exchange_name: exchangeName, sandbox: payload.sandbox });
  return connectionSummary(data as Record<string, unknown>);
}

export async function testExchangeConnection(actor: Actor) {
  const connection = await getActiveConnectionSecrets();
  if (!connection) throw new Error("Brak aktywnego polaczenia gieldy.");
  const provider = createMarketProvider({ exchangeName: connection.exchange_name, apiKey: connection.apiKey, apiSecret: connection.apiSecret, sandbox: connection.sandbox });
  try {
    const balances = await provider.getBalance?.();
    await adminDb().from("trader_exchange_connections").update({ status: "connected", tested_at: iso() }).eq("id", connection.id);
    await audit(actor, "trader_exchange_test_succeeded", "trader_exchange_connections", connection.id, { balances: balances?.length || 0 });
    return { ok: true, balances: balances || [] };
  } catch (error) {
    await adminDb().from("trader_exchange_connections").update({ status: "failed", tested_at: iso() }).eq("id", connection.id);
    await audit(actor, "trader_exchange_test_failed", "trader_exchange_connections", connection.id, { message: error instanceof Error ? error.message : "Blad gieldy" });
    throw error;
  }
}

export async function getTraderMarkets() {
  const provider = await providerWithOptionalSecrets();
  const markets = await provider.getMarkets();
  const top = markets.slice(0, 18);
  const tickers = await Promise.all(top.map((market) => provider.getTicker(market.symbol).catch(() => null)));
  return { markets: top, tickers: tickers.filter(Boolean) };
}

export async function getTraderCandles(symbol: string, timeframe = "1h"): Promise<Candle[]> {
  if (!/^[A-Z0-9]{4,24}$/.test(symbol)) throw new Error("Nieprawidlowy symbol rynku.");
  const provider = await providerWithOptionalSecrets();
  return provider.getCandles(symbol, timeframe);
}

export async function runMarketScan(actor?: Actor | null) {
  const settings = await getSettings(actor);
  const provider = await providerWithOptionalSecrets();
  const signals = await scanMemecoinMarkets(provider, settings);
  if (!signals.length) return { generated: 0, signals: [] as TraderMarketSignal[] };
  const { data, error } = await adminDb().from("trader_market_signals").insert(signals.map((signal) => ({
    coin_name: signal.coin_name,
    symbol: signal.symbol,
    pair: signal.pair,
    exchange: signal.exchange,
    price: signal.price,
    price_change_percent: signal.price_change_percent,
    volume_24h: signal.volume_24h,
    liquidity: signal.liquidity,
    spread_percent: signal.spread_percent,
    entry_min: signal.entry_min,
    entry_max: signal.entry_max,
    stop_loss: signal.stop_loss,
    take_profit: signal.take_profit,
    risk_level: signal.risk_level,
    confidence_score: signal.confidence_score,
    rationale: signal.rationale,
    generated_at: signal.generated_at,
    valid_until: signal.valid_until,
    status: signal.status,
  }))).select("*");
  if (error) throw error;
  await audit(actor || null, "trader_signal_generated", "trader_market_signals", null, { generated: data?.length || 0 });
  return { generated: data?.length || 0, signals: (data || []) as TraderMarketSignal[] };
}

export async function startPaperTrading(actor: Actor) {
  const provider = await providerWithOptionalSecrets();
  const markets = await provider.getMarkets();
  if (!markets.length) throw new Error("Nie udalo sie potwierdzic rzeczywistych danych rynkowych. Paper trading pozostaje wylaczony.");
  const settings = await saveTraderSettings(actor, { paper_enabled: true });
  await audit(actor, "trader_paper_started", "trader_settings", settings.id || null);
  return settings;
}

export async function stopPaperTrading(actor: Actor) {
  const settings = await saveTraderSettings(actor, { paper_enabled: false });
  await audit(actor, "trader_paper_stopped", "trader_settings", settings.id || null);
  return settings;
}

export async function startLiveTrading(actor: Actor, mode: TraderTradingMode) {
  if (!liveTradingEnvEnabled()) throw new Error("LIVE_TRADING_ENABLED=false blokuje uruchomienie live tradingu.");
  const connection = await getActiveConnectionSummary();
  if (!connection || connection.status !== "connected") throw new Error("Najpierw podlacz i przetestuj klucz API gieldy.");
  const safeMode = mode === "automatic" ? "automatic" : "approval_required";
  const settings = await saveTraderSettings(actor, { trading_mode: safeMode });
  await audit(actor, "trader_live_started", "trader_settings", settings.id || null, { mode: safeMode });
  return settings;
}

export async function stopLiveTrading(actor: Actor) {
  const settings = await saveTraderSettings(actor, { trading_mode: "disabled" });
  await audit(actor, "trader_live_stopped", "trader_settings", settings.id || null);
  return settings;
}

export async function emergencyStop(actor: Actor) {
  const settings = await getSettings(actor);
  const db = adminDb();
  const { error } = await db.from("trader_settings").update({
    trading_mode: "disabled",
    paper_enabled: false,
    emergency_stop_active: true,
    emergency_stop_used_at: iso(),
    emergency_stop_used_by: actor.email || actor.id,
    updated_at: iso(),
  }).eq("id", settings.id);
  if (error) throw error;
  const { error: approvalError } = await db
    .from("trader_approval_requests")
    .update({ status: "cancelled", decided_at: iso(), decided_by: actor.email || actor.id })
    .eq("status", "pending");
  if (approvalError) throw approvalError;
  await audit(actor, "trader_emergency_stop_used", "trader_settings", settings.id || null);
  return getSettings(actor);
}

export async function rejectApproval(actor: Actor, id: string) {
  const { data, error } = await adminDb().from("trader_approval_requests").update({
    status: "rejected",
    decided_at: iso(),
    decided_by: actor.email || actor.id,
  }).eq("id", id).select("*").single();
  if (error) throw error;
  await audit(actor, "trader_approval_rejected", "trader_approval_requests", id);
  return data as TraderApprovalRequest;
}

export async function approveApproval(actor: Actor, id: string, amountOverride?: string | null) {
  const db = adminDb();
  const { data, error } = await db.from("trader_approval_requests").select("*").eq("id", id).single();
  if (error) throw error;
  const approval = data as TraderApprovalRequest;
  if (approval.status !== "pending") throw new Error("Ta propozycja nie oczekuje juz na decyzje.");
  if (isApprovalExpired(approval.expires_at)) {
    await db.from("trader_approval_requests").update({ status: "expired" }).eq("id", id);
    throw new Error("Propozycja wygasla i nie moze zostac wykonana.");
  }

  const settings = await getSettings(actor);
  const connection = await getActiveConnectionSecrets();
  if (!connection) throw new Error("Brak aktywnego polaczenia gieldy.");
  const provider = createMarketProvider({ exchangeName: connection.exchange_name, apiKey: connection.apiKey, apiSecret: connection.apiSecret, sandbox: connection.sandbox });
  const ticker = await provider.getTicker(approval.symbol);
  const amount = amountOverride && compareDecimal(amountOverride, "0") > 0 && compareDecimal(amountOverride, approval.proposed_amount) < 0
    ? amountOverride
    : approval.proposed_amount;
  const snapshot = await riskSnapshot(settings);
  const risk = evaluateEntryRisk({
    settings,
    orderValue: amount,
    accountBalance: settings.paper_balance,
    currentExposure: snapshot.currentExposure,
    openPositions: snapshot.openPositions.length,
    dailyRealizedPnl: snapshot.dailyRisk.realized_pnl,
    startingEquity: snapshot.dailyRisk.starting_equity,
    spreadPercent: ticker.spreadPercent,
    slippagePercent: approval.expected_slippage_percent,
    volume24h: ticker.quoteVolume,
    liquidity: ticker.liquidity || "0",
    tradesToday: snapshot.dailyRisk.trades_count,
  });
  const idempotencyKey = createOrderIdempotencyKey({ approvalId: approval.id, symbol: approval.symbol, side: approval.side });
  const { count, error: countError } = await db.from("trader_orders").select("id", { count: "exact", head: true }).eq("idempotency_key", idempotencyKey);
  if (countError) throw countError;
  const liveDecision = evaluateLiveExecution({
    liveTradingEnabled: liveTradingEnvEnabled(),
    exchangeConnected: connection.status === "connected",
    tradingMode: settings.trading_mode,
    approvalRequired: settings.trading_mode === "approval_required",
    approved: true,
    approvalExpiresAt: approval.expires_at,
    riskDecision: risk,
    idempotencyAlreadyUsed: Boolean(count),
    emergencyStopActive: settings.emergency_stop_active,
  });
  if (!liveDecision.allowed) throw new Error(liveDecision.message);

  const { data: orderRow, error: orderError } = await db.from("trader_orders").insert({
    owner_id: actor.id,
    exchange: approval.exchange,
    symbol: approval.symbol,
    side: approval.side,
    type: approval.order_type,
    status: "pending",
    amount,
    price: ticker.price,
    idempotency_key: idempotencyKey,
    approval_request_id: approval.id,
  }).select("*").single();
  if (orderError) throw orderError;

  const order = await provider.createOrder?.({
    symbol: approval.symbol,
    side: approval.side,
    type: approval.order_type,
    quoteOrderQty: amount,
    clientOrderId: idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 36),
  });
  await db.from("trader_orders").update({
    status: order ? "submitted" : "failed",
    exchange_order_id: order?.orderId || null,
    raw_response: order?.raw || null,
  }).eq("id", String(orderRow.id));
  await db.from("trader_approval_requests").update({
    status: "approved",
    decided_at: iso(),
    decided_by: actor.email || actor.id,
  }).eq("id", approval.id);
  await audit(actor, "trader_live_order_submitted", "trader_orders", String(orderRow.id), { symbol: approval.symbol, amount });
  return { order: orderRow as TraderOrder, exchangeOrder: order || null };
}

async function updateDailyRiskAfterTrade(pnl: string, settings: TraderSettings) {
  const dailyRisk = await getDailyRisk(settings);
  const realized = fromUnits(toUnits(dailyRisk.realized_pnl) + toUnits(pnl));
  const lossLimitHit = compareDecimal(realized, `-${settings.max_daily_loss_amount}`) <= 0;
  const nextDay = new Date(`${todayKey()}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const { error } = await adminDb().from("trader_daily_risk").update({
    realized_pnl: realized,
    daily_loss_limit_hit: lossLimitHit,
    locked_until: lossLimitHit ? nextDay.toISOString() : dailyRisk.locked_until,
    trades_count: Number(dailyRisk.trades_count || 0) + 1,
    loss_streak: compareDecimal(pnl, "0") < 0 ? Number(dailyRisk.loss_streak || 0) + 1 : 0,
  }).eq("risk_date", todayKey());
  if (error) throw error;
  if (lossLimitHit) await audit(null, "trader_daily_loss_limit_hit", "trader_daily_risk", dailyRisk.id || null, { realized_pnl: realized });
}

export async function runPaperEngine(actor?: Actor | null) {
  const lockId = await acquireSystemLock("trader-paper-engine", 4);
  if (!lockId) return { opened: 0, closed: 0, skipped: "Inny paper engine juz dziala." };
  try {
    const settings = await getSettings(actor);
    if (!settings.paper_enabled || settings.emergency_stop_active) return { opened: 0, closed: 0, skipped: "Paper trading jest wylaczony albo zatrzymany awaryjnie." };
    const provider = await providerWithOptionalSecrets();
    const db = adminDb();
    let closed = 0;

    const { data: openPositions, error: openError } = await db.from("trader_positions").select("*").eq("status", "open");
    if (openError) throw openError;
    for (const position of (openPositions || []) as TraderPosition[]) {
      const ticker = await provider.getTicker(position.symbol).catch(() => null);
      if (!ticker) continue;
      const shouldClose = (position.stop_loss && compareDecimal(ticker.price, position.stop_loss) <= 0) || (position.take_profit && compareDecimal(ticker.price, position.take_profit) >= 0);
      const close = calculatePaperClose({
        quantity: position.quantity,
        entryCost: position.entry_value,
        exitPrice: ticker.price,
        spreadPercent: ticker.spreadPercent,
        slippagePercent: settings.max_slippage_percent,
        feePercent: settings.simulated_fee_percent,
      });
      if (shouldClose) {
        await db.from("trader_positions").update({
          status: "closed",
          current_price: ticker.price,
          exit_price: close.effectiveExitPrice,
          current_value: close.netExitValue,
          realized_pnl: close.realizedPnl,
          realized_pnl_percent: close.realizedPnlPercent,
          unrealized_pnl: "0",
          closed_at: iso(),
        }).eq("id", position.id);
        await db.from("trader_trades").insert({
          position_id: position.id,
          symbol: position.symbol,
          side: "sell",
          price: close.effectiveExitPrice,
          quantity: position.quantity,
          fee: close.exitFee,
          slippage: settings.max_slippage_percent,
          realized_pnl: close.realizedPnl,
          traded_at: iso(),
        });
        const nextBalance = fromUnits(toUnits(settings.paper_balance) + toUnits(close.netExitValue));
        await db.from("trader_settings").update({ paper_balance: nextBalance, updated_at: iso() }).eq("id", settings.id);
        await updateDailyRiskAfterTrade(close.realizedPnl, { ...settings, paper_balance: nextBalance });
        await audit(actor || null, "trader_position_closed", "trader_positions", position.id, { symbol: position.symbol, pnl: close.realizedPnl });
        settings.paper_balance = nextBalance;
        closed += 1;
      } else {
        await db.from("trader_positions").update({
          current_price: ticker.price,
          current_value: close.netExitValue,
          unrealized_pnl: close.realizedPnl,
        }).eq("id", position.id);
      }
    }

    const latest = await db
      .from("trader_market_signals")
      .select("*")
      .eq("status", "buy")
      .gt("valid_until", iso())
      .order("confidence_score", { ascending: false })
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw latest.error;
    if (!latest.data) return { opened: 0, closed };

    const signal = latest.data as TraderMarketSignal;
    const snapshot = await riskSnapshot(settings);
    const risk = evaluateEntryRisk({
      settings,
      orderValue: settings.max_entry_amount,
      accountBalance: settings.paper_balance,
      currentExposure: snapshot.currentExposure,
      openPositions: snapshot.openPositions.length,
      dailyRealizedPnl: snapshot.dailyRisk.realized_pnl,
      startingEquity: snapshot.dailyRisk.starting_equity,
      spreadPercent: signal.spread_percent,
      slippagePercent: settings.max_slippage_percent,
      volume24h: signal.volume_24h,
      liquidity: signal.liquidity || "0",
      tradesToday: snapshot.dailyRisk.trades_count,
    });
    if (!risk.allowed) return { opened: 0, closed, skipped: risk.message };

    const entry = calculatePaperEntry({
      orderValue: settings.max_entry_amount,
      price: signal.price,
      spreadPercent: signal.spread_percent,
      slippagePercent: settings.max_slippage_percent,
      feePercent: settings.simulated_fee_percent,
    });
    if (compareDecimal(settings.paper_balance, entry.entryCost) < 0) return { opened: 0, closed, skipped: "Saldo paper tradingu jest za niskie." };
    const { data: inserted, error: insertError } = await db.from("trader_positions").insert({
      owner_id: actor?.id || null,
      signal_id: signal.id,
      symbol: signal.symbol,
      pair: signal.pair,
      exchange: signal.exchange,
      side: "buy",
      status: "open",
      entry_price: entry.effectiveEntryPrice,
      current_price: signal.price,
      quantity: entry.quantity,
      entry_value: entry.entryCost,
      current_value: settings.max_entry_amount,
      realized_pnl: "0",
      unrealized_pnl: "0",
      realized_pnl_percent: "0",
      stop_loss: signal.stop_loss,
      take_profit: signal.take_profit,
      opened_at: iso(),
    }).select("*").single();
    if (insertError) throw insertError;
    await db.from("trader_trades").insert({
      position_id: inserted.id,
      symbol: signal.symbol,
      side: "buy",
      price: entry.effectiveEntryPrice,
      quantity: entry.quantity,
      fee: entry.entryFee,
      slippage: settings.max_slippage_percent,
      traded_at: iso(),
    });
    const nextBalance = fromUnits(toUnits(settings.paper_balance) - toUnits(entry.entryCost));
    await db.from("trader_settings").update({ paper_balance: nextBalance, updated_at: iso() }).eq("id", settings.id);
    await audit(actor || null, "trader_position_opened", "trader_positions", String(inserted.id), { symbol: signal.symbol, amount: settings.max_entry_amount });
    return { opened: 1, closed };
  } finally {
    await releaseSystemLock("trader-paper-engine", lockId);
  }
}

export async function runLiveExecutor(actor?: Actor | null) {
  const lockId = await acquireSystemLock("trader-live-executor", 4);
  if (!lockId) return { proposals: 0, submitted: 0, skipped: "Inny live executor juz dziala." };
  try {
    const settings = await getSettings(actor);
    if (settings.trading_mode === "disabled" || settings.emergency_stop_active) return { proposals: 0, submitted: 0, skipped: "Live trading jest wylaczony albo zatrzymany." };
    const db = adminDb();
    const { data: signalData, error: signalError } = await db
      .from("trader_market_signals")
      .select("*")
      .eq("status", "buy")
      .gt("valid_until", iso())
      .order("confidence_score", { ascending: false })
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (signalError) throw signalError;
    if (!signalData) return { proposals: 0, submitted: 0, skipped: "Brak waznych sygnalow kupna." };
    const signal = signalData as TraderMarketSignal;
    const key = createOrderIdempotencyKey({ signalId: signal.id, symbol: signal.symbol, side: "buy" });
    const { count, error: countError } = await db.from("trader_orders").select("id", { count: "exact", head: true }).eq("idempotency_key", key);
    if (countError) throw countError;
    if (count) return { proposals: 0, submitted: 0, skipped: "Sygnał ma juz zlecenie z tym kluczem idempotencji." };

    if (settings.trading_mode === "approval_required") {
      const { count: pendingCount, error: pendingError } = await db
        .from("trader_approval_requests")
        .select("id", { count: "exact", head: true })
        .eq("signal_id", signal.id)
        .eq("status", "pending");
      if (pendingError) throw pendingError;
      if (pendingCount) return { proposals: 0, submitted: 0, skipped: "Propozycja dla tego sygnalu juz istnieje." };
      const { data, error } = await db.from("trader_approval_requests").insert({
        owner_id: actor?.id || null,
        signal_id: signal.id,
        symbol: signal.symbol,
        pair: signal.pair,
        exchange: signal.exchange,
        order_type: "market",
        side: "buy",
        proposed_amount: settings.max_entry_amount,
        current_price: signal.price,
        stop_loss: signal.stop_loss,
        expected_slippage_percent: settings.max_slippage_percent,
        rationale: signal.rationale,
        risk_level: signal.risk_level,
        status: "pending",
        expires_at: addMinutes(new Date(), 15).toISOString(),
      }).select("*").single();
      if (error) throw error;
      await audit(actor || null, "trader_approval_created", "trader_approval_requests", String(data.id), { symbol: signal.symbol });
      return { proposals: 1, submitted: 0 };
    }

    if (!liveTradingEnvEnabled()) return { proposals: 0, submitted: 0, skipped: "LIVE_TRADING_ENABLED=false." };
    return { proposals: 0, submitted: 0, skipped: "Tryb automatic wymaga zatwierdzonego polaczenia i jest obslugiwany przez endpoint akceptacji w tej wersji." };
  } finally {
    await releaseSystemLock("trader-live-executor", lockId);
  }
}

export async function scanOneSignal(symbol: string) {
  const settings = await getSettings();
  const provider = await providerWithOptionalSecrets();
  return buildMarketSignal(provider, symbol, settings);
}
