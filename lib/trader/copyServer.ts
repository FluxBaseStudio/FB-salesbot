import "server-only";

import { acquireSystemLock, releaseSystemLock } from "@/lib/bot/runLock";
import { adminDb } from "@/lib/supabaseAdmin";
import {
  absolutePercentDifference,
  applyPercent,
  calculatePaperClose,
  calculatePaperEntry,
  compareDecimal,
  evaluateEntryRisk,
  fromUnits,
  percentOf,
  toUnits,
} from "@/lib/trader/engine";
import { createMarketProvider } from "@/lib/trader/providers";
import { runTraderAiCouncil } from "@/lib/trader/aiBots";
import type {
  TraderCopyOverview,
  TraderCopySignal,
  TraderCopySource,
  TraderDailyRisk,
  TraderPosition,
  TraderRiskLevel,
  TraderSettings,
} from "@/lib/trader/types";
import { TRADER_DEFAULT_SETTINGS } from "@/lib/trader/types";

type Actor = { id: string; email?: string | null };
type CopySettingsPatch = Partial<
  Pick<
    TraderSettings,
    | "copy_enabled"
    | "copy_position_amount"
    | "copy_min_source_score"
    | "copy_min_confidence_score"
    | "copy_max_signal_age_seconds"
    | "copy_max_price_drift_percent"
    | "copy_require_ai_review"
    | "copy_min_ai_confidence_score"
    | "copy_promote_to_live_proposals"
  >
>;

const ALLOWED_CHAINS = new Set([
  "solana",
  "base",
  "bnb",
  "monad",
  "hyperliquid",
  "other",
]);
const LOSS_STREAK_THRESHOLD = 3;

function iso(date = new Date()) {
  return date.toISOString();
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function nextUtcDay(date = new Date()) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function clampInteger(value: unknown, fallback: number, min = 0, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function decimal(value: unknown, fallback: string) {
  try {
    return fromUnits(
      toUnits(
        value === undefined || value === null || value === ""
          ? fallback
          : String(value),
      ),
    );
  } catch {
    return fallback;
  }
}

function copySettingsFromRow(
  row: Partial<TraderSettings> | null | undefined,
): TraderSettings {
  return {
    ...TRADER_DEFAULT_SETTINGS,
    ...(row || {}),
    paper_enabled: Boolean(
      row?.paper_enabled ?? TRADER_DEFAULT_SETTINGS.paper_enabled,
    ),
    emergency_stop_active: Boolean(
      row?.emergency_stop_active ??
      TRADER_DEFAULT_SETTINGS.emergency_stop_active,
    ),
    copy_enabled: Boolean(
      row?.copy_enabled ?? TRADER_DEFAULT_SETTINGS.copy_enabled,
    ),
    copy_min_source_score: clampInteger(
      row?.copy_min_source_score,
      TRADER_DEFAULT_SETTINGS.copy_min_source_score,
    ),
    copy_min_confidence_score: clampInteger(
      row?.copy_min_confidence_score,
      TRADER_DEFAULT_SETTINGS.copy_min_confidence_score,
    ),
    copy_max_signal_age_seconds: clampInteger(
      row?.copy_max_signal_age_seconds,
      TRADER_DEFAULT_SETTINGS.copy_max_signal_age_seconds,
      15,
      3600,
    ),
    copy_require_ai_review: Boolean(
      row?.copy_require_ai_review ??
      TRADER_DEFAULT_SETTINGS.copy_require_ai_review,
    ),
    copy_min_ai_confidence_score: clampInteger(
      row?.copy_min_ai_confidence_score,
      TRADER_DEFAULT_SETTINGS.copy_min_ai_confidence_score,
    ),
    copy_promote_to_live_proposals: Boolean(
      row?.copy_promote_to_live_proposals ??
      TRADER_DEFAULT_SETTINGS.copy_promote_to_live_proposals,
    ),
    max_open_positions: Number(
      row?.max_open_positions ?? TRADER_DEFAULT_SETTINGS.max_open_positions,
    ),
    max_daily_trades: Number(
      row?.max_daily_trades ?? TRADER_DEFAULT_SETTINGS.max_daily_trades,
    ),
    loss_streak_cooldown_minutes: Number(
      row?.loss_streak_cooldown_minutes ??
        TRADER_DEFAULT_SETTINGS.loss_streak_cooldown_minutes,
    ),
  };
}

async function getSettings() {
  const { data, error } = await adminDb()
    .from("trader_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      "Najpierw uruchom migracje TraderBota i otworz panel, aby utworzyc ustawienia.",
    );
  return copySettingsFromRow(data as Partial<TraderSettings>);
}

async function audit(
  actor: Actor | null,
  action: string,
  resource: string,
  resourceId?: string | null,
  details?: unknown,
) {
  const { error } = await adminDb()
    .from("trader_audit_logs")
    .insert({
      actor_id: actor?.id || null,
      actor_email: actor?.email || null,
      action,
      resource,
      resource_id: resourceId || null,
      details: details || null,
    });
  if (error) console.error("copy trading audit failed", error.message);
}

function sourceFromRow(row: Record<string, unknown>): TraderCopySource {
  return {
    id: String(row.id),
    platform: "fomo",
    display_name: String(row.display_name || "FOMO trader"),
    profile_reference: row.profile_reference
      ? String(row.profile_reference)
      : null,
    wallet_address: row.wallet_address ? String(row.wallet_address) : null,
    chain: String(row.chain || "solana"),
    source_score: Number(row.source_score || 0),
    win_rate_percent: String(row.win_rate_percent || "0"),
    max_drawdown_percent: String(row.max_drawdown_percent || "0"),
    observed_trades: Number(row.observed_trades || 0),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at || iso()),
    updated_at: String(row.updated_at || iso()),
  };
}

function signalFromRow(
  row: Record<string, unknown>,
  sourceNames?: Map<string, string>,
): TraderCopySignal {
  const sourceId = row.source_id ? String(row.source_id) : null;
  return {
    id: String(row.id),
    source_id: sourceId,
    source_name: sourceId ? sourceNames?.get(sourceId) || null : null,
    platform: "fomo",
    external_signal_id: row.external_signal_id
      ? String(row.external_signal_id)
      : null,
    symbol: String(row.symbol || ""),
    pair: String(row.pair || ""),
    chain: String(row.chain || "solana"),
    side: row.side === "sell" ? "sell" : "buy",
    source_price: String(row.source_price || "0"),
    observed_price:
      row.observed_price === null || row.observed_price === undefined
        ? null
        : String(row.observed_price),
    current_price:
      row.current_price === null || row.current_price === undefined
        ? null
        : String(row.current_price),
    source_amount:
      row.source_amount === null || row.source_amount === undefined
        ? null
        : String(row.source_amount),
    detected_at: String(row.detected_at || iso()),
    received_at: String(row.received_at || iso()),
    expires_at: String(row.expires_at || iso()),
    source_score: Number(row.source_score || 0),
    confidence_score: Number(row.confidence_score || 0),
    price_drift_percent: String(row.price_drift_percent || "0"),
    risk_level: ["low", "medium", "high", "blocked"].includes(
      String(row.risk_level),
    )
      ? (String(row.risk_level) as TraderRiskLevel)
      : "medium",
    status: [
      "pending",
      "qualified",
      "promoted",
      "copied",
      "skipped",
      "expired",
    ].includes(String(row.status))
      ? (row.status as TraderCopySignal["status"])
      : "pending",
    rationale: String(row.rationale || ""),
    copied_position_id: row.copied_position_id
      ? String(row.copied_position_id)
      : null,
    promoted_signal_id: row.promoted_signal_id
      ? String(row.promoted_signal_id)
      : null,
    ai_decision:
      row.ai_decision === "buy" ||
      row.ai_decision === "watch" ||
      row.ai_decision === "reject"
        ? row.ai_decision
        : null,
    ai_confidence_score:
      row.ai_confidence_score === null || row.ai_confidence_score === undefined
        ? null
        : Number(row.ai_confidence_score),
    ai_risk_level: ["low", "medium", "high", "blocked"].includes(
      String(row.ai_risk_level),
    )
      ? (row.ai_risk_level as TraderRiskLevel)
      : null,
    ai_rationale: row.ai_rationale ? String(row.ai_rationale) : null,
    analyzed_at: row.analyzed_at ? String(row.analyzed_at) : null,
    created_at: String(row.created_at || iso()),
    updated_at: String(row.updated_at || iso()),
  };
}

export async function getFomoCopyOverview(): Promise<TraderCopyOverview> {
  const settings = await getSettings();
  const db = adminDb();
  const [sourcesResult, signalsResult, positionsResult] = await Promise.all([
    db
      .from("trader_copy_sources")
      .select("*")
      .order("source_score", { ascending: false })
      .order("created_at", { ascending: false }),
    db
      .from("trader_copy_signals")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(100),
    db
      .from("trader_positions")
      .select("id")
      .eq("position_origin", "fomo_copy")
      .eq("status", "open"),
  ]);
  if (sourcesResult.error) throw sourcesResult.error;
  if (signalsResult.error) throw signalsResult.error;
  if (positionsResult.error) throw positionsResult.error;

  const sources = (sourcesResult.data || []).map((row) =>
    sourceFromRow(row as Record<string, unknown>),
  );
  const names = new Map(
    sources.map((source) => [source.id, source.display_name]),
  );
  const signals = (signalsResult.data || []).map((row) =>
    signalFromRow(row as Record<string, unknown>, names),
  );

  return {
    settings: {
      copy_enabled: settings.copy_enabled,
      copy_position_amount: settings.copy_position_amount,
      copy_min_source_score: settings.copy_min_source_score,
      copy_min_confidence_score: settings.copy_min_confidence_score,
      copy_max_signal_age_seconds: settings.copy_max_signal_age_seconds,
      copy_max_price_drift_percent: settings.copy_max_price_drift_percent,
      copy_require_ai_review: settings.copy_require_ai_review,
      copy_min_ai_confidence_score: settings.copy_min_ai_confidence_score,
      copy_promote_to_live_proposals: settings.copy_promote_to_live_proposals,
      paper_enabled: settings.paper_enabled,
      paper_balance: settings.paper_balance,
      emergency_stop_active: settings.emergency_stop_active,
    },
    sources,
    signals,
    metrics: {
      activeSources: sources.filter((source) => source.is_active).length,
      pendingSignals: signals.filter(
        (signal) =>
          signal.status === "pending" || signal.status === "qualified",
      ).length,
      copiedSignals: signals.filter((signal) => signal.status === "copied")
        .length,
      skippedSignals: signals.filter(
        (signal) => signal.status === "skipped" || signal.status === "expired",
      ).length,
      copyPositionsOpen: (positionsResult.data || []).length,
    },
  };
}

export async function saveFomoCopySettings(
  actor: Actor,
  input: Record<string, unknown>,
) {
  const current = await getSettings();
  const patch: CopySettingsPatch = {};
  if ("copy_enabled" in input) patch.copy_enabled = input.copy_enabled === true;
  if ("copy_position_amount" in input)
    patch.copy_position_amount = decimal(
      input.copy_position_amount,
      current.copy_position_amount,
    );
  if ("copy_min_source_score" in input)
    patch.copy_min_source_score = clampInteger(
      input.copy_min_source_score,
      current.copy_min_source_score,
    );
  if ("copy_min_confidence_score" in input)
    patch.copy_min_confidence_score = clampInteger(
      input.copy_min_confidence_score,
      current.copy_min_confidence_score,
    );
  if ("copy_max_signal_age_seconds" in input)
    patch.copy_max_signal_age_seconds = clampInteger(
      input.copy_max_signal_age_seconds,
      current.copy_max_signal_age_seconds,
      15,
      3600,
    );
  if ("copy_max_price_drift_percent" in input)
    patch.copy_max_price_drift_percent = decimal(
      input.copy_max_price_drift_percent,
      current.copy_max_price_drift_percent,
    );
  if ("copy_require_ai_review" in input)
    patch.copy_require_ai_review = input.copy_require_ai_review === true;
  if ("copy_min_ai_confidence_score" in input)
    patch.copy_min_ai_confidence_score = clampInteger(
      input.copy_min_ai_confidence_score,
      current.copy_min_ai_confidence_score,
    );
  if ("copy_promote_to_live_proposals" in input)
    patch.copy_promote_to_live_proposals =
      input.copy_promote_to_live_proposals === true;

  if (
    patch.copy_position_amount &&
    compareDecimal(patch.copy_position_amount, "0") <= 0
  )
    throw new Error("Kwota paper copy tradingu musi byc dodatnia.");
  if (
    patch.copy_max_price_drift_percent &&
    compareDecimal(patch.copy_max_price_drift_percent, "0") < 0
  )
    throw new Error("Maksymalna roznica ceny nie moze byc ujemna.");

  const { data, error } = await adminDb()
    .from("trader_settings")
    .update({ ...patch, updated_at: iso() })
    .eq("id", current.id)
    .select("*")
    .single();
  if (error) throw error;
  await audit(
    actor,
    "trader_copy_settings_updated",
    "trader_settings",
    String(current.id),
    patch,
  );
  return copySettingsFromRow(data as Partial<TraderSettings>);
}

export async function upsertFomoSource(
  actor: Actor,
  input: Record<string, unknown>,
) {
  const id =
    typeof input.id === "string" && /^[0-9a-f-]{36}$/i.test(input.id)
      ? input.id
      : null;
  const displayName = String(input.display_name || "")
    .trim()
    .slice(0, 80);
  if (displayName.length < 2)
    throw new Error("Podaj nazwe tradera lub portfela.");
  const chainRaw = String(input.chain || "solana")
    .trim()
    .toLowerCase();
  const chain = ALLOWED_CHAINS.has(chainRaw) ? chainRaw : "other";
  const wallet =
    String(input.wallet_address || "")
      .trim()
      .slice(0, 160) || null;
  const profile =
    String(input.profile_reference || "")
      .trim()
      .slice(0, 240) || null;
  const payload = {
    owner_id: actor.id,
    platform: "fomo",
    display_name: displayName,
    profile_reference: profile,
    wallet_address: wallet,
    chain,
    source_score: clampInteger(input.source_score, 70),
    win_rate_percent: decimal(input.win_rate_percent, "0"),
    max_drawdown_percent: decimal(input.max_drawdown_percent, "0"),
    observed_trades: clampInteger(input.observed_trades, 0, 0, 1_000_000),
    is_active: input.is_active !== false,
    updated_at: iso(),
  };

  const query = id
    ? adminDb()
        .from("trader_copy_sources")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
    : adminDb()
        .from("trader_copy_sources")
        .insert(payload)
        .select("*")
        .single();
  const { data, error } = await query;
  if (error) throw error;
  await audit(
    actor,
    id ? "trader_copy_source_updated" : "trader_copy_source_created",
    "trader_copy_sources",
    String(data.id),
    { display_name: displayName, chain },
  );
  return sourceFromRow(data as Record<string, unknown>);
}

export async function toggleFomoSource(
  actor: Actor,
  id: string,
  isActive: boolean,
) {
  const { data, error } = await adminDb()
    .from("trader_copy_sources")
    .update({ is_active: isActive, updated_at: iso() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await audit(
    actor,
    isActive ? "trader_copy_source_enabled" : "trader_copy_source_disabled",
    "trader_copy_sources",
    id,
  );
  return sourceFromRow(data as Record<string, unknown>);
}

function parseDetectedAt(value: unknown) {
  const detected = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(detected.getTime()))
    throw new Error("Nieprawidlowa data sygnalu.");
  if (detected.getTime() > Date.now() + 60_000)
    throw new Error("Data sygnalu nie moze byc z przyszlosci.");
  return detected;
}

const SENSITIVE_PAYLOAD_KEY =
  /(secret|token|password|passphrase|api[_-]?key|private[_-]?key|seed|mnemonic|authorization|cookie)/i;

function sanitizeRawPayload(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth-limit]";
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    typeof value === "number"
  )
    return value ?? null;
  if (typeof value === "string") return value.slice(0, 2000);
  if (Array.isArray(value))
    return value
      .slice(0, 50)
      .map((item) => sanitizeRawPayload(item, depth + 1));
  if (typeof value !== "object") return String(value).slice(0, 500);

  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(
    value as Record<string, unknown>,
  ).slice(0, 100)) {
    sanitized[key.slice(0, 120)] = SENSITIVE_PAYLOAD_KEY.test(key)
      ? "[redacted]"
      : sanitizeRawPayload(item, depth + 1);
  }
  return sanitized;
}

function boundedRawPayload(value: unknown) {
  const sanitized = sanitizeRawPayload(value);
  const serialized = JSON.stringify(sanitized);
  if (serialized.length <= 32_000) return sanitized;
  return { truncated: true, preview: serialized.slice(0, 30_000) };
}

export async function importFomoSignal(
  actor: Actor | null,
  input: Record<string, unknown>,
  rawPayload?: unknown,
) {
  const settings = await getSettings();
  const sourceId =
    typeof input.source_id === "string" &&
    /^[0-9a-f-]{36}$/i.test(input.source_id)
      ? input.source_id
      : null;
  let source: TraderCopySource | null = null;
  if (sourceId) {
    const { data, error } = await adminDb()
      .from("trader_copy_sources")
      .select("*")
      .eq("id", sourceId)
      .single();
    if (error) throw error;
    source = sourceFromRow(data as Record<string, unknown>);
    if (!source.is_active)
      throw new Error("Wybrane zrodlo FOMO jest wylaczone.");
  }

  const symbol = String(input.symbol || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z0-9]{4,24}$/.test(symbol))
    throw new Error("Podaj symbol rynku, np. PEPEUSDT.");
  const side = input.side === "sell" ? "sell" : "buy";
  const sourcePrice = decimal(input.source_price, "0");
  if (compareDecimal(sourcePrice, "0") <= 0)
    throw new Error("Cena zrodlowa musi byc dodatnia.");
  const detectedAt = parseDetectedAt(input.detected_at);
  const confidence = clampInteger(input.confidence_score, 70);
  const sourceScore =
    source?.source_score ?? clampInteger(input.source_score, 70);
  const chainRaw = String(input.chain || source?.chain || "solana")
    .trim()
    .toLowerCase();
  const chain = ALLOWED_CHAINS.has(chainRaw) ? chainRaw : "other";
  const externalId =
    String(input.external_signal_id || "")
      .trim()
      .slice(0, 160) || null;
  const pair = String(input.pair || symbol.replace(/USDT$/, "/USDT"))
    .trim()
    .slice(0, 40);
  const expiresAt = addSeconds(
    detectedAt,
    settings.copy_max_signal_age_seconds,
  );
  const riskLevel: TraderRiskLevel =
    sourceScore >= 80 && confidence >= 75
      ? "low"
      : sourceScore >= 65 && confidence >= 60
        ? "medium"
        : "high";
  const rationale = String(
    input.rationale ||
      `Sygnał ${side === "buy" ? "kupna" : "sprzedaży"} zaimportowany do paper copy tradingu.`,
  )
    .trim()
    .slice(0, 1000);

  const { data, error } = await adminDb()
    .from("trader_copy_signals")
    .insert({
      owner_id: actor?.id || null,
      source_id: sourceId,
      platform: "fomo",
      external_signal_id: externalId,
      symbol,
      pair,
      chain,
      side,
      source_price: sourcePrice,
      source_amount: input.source_amount
        ? decimal(input.source_amount, "0")
        : null,
      detected_at: detectedAt.toISOString(),
      received_at: iso(),
      expires_at: expiresAt.toISOString(),
      source_score: sourceScore,
      confidence_score: confidence,
      price_drift_percent: "0",
      risk_level: riskLevel,
      status: expiresAt.getTime() <= Date.now() ? "expired" : "pending",
      rationale,
      raw_payload: boundedRawPayload(rawPayload ?? input),
      updated_at: iso(),
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505")
      throw new Error("Ten sygnal FOMO zostal juz zapisany.");
    throw error;
  }
  await audit(
    actor,
    "trader_copy_signal_imported",
    "trader_copy_signals",
    String(data.id),
    { symbol, side, source_id: sourceId },
  );
  return signalFromRow(
    data as Record<string, unknown>,
    source ? new Map([[source.id, source.display_name]]) : undefined,
  );
}

async function getDailyRisk(settings: TraderSettings) {
  const db = adminDb();
  const riskDate = todayKey();
  const { data, error } = await db
    .from("trader_daily_risk")
    .select("*")
    .eq("risk_date", riskDate)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as TraderDailyRisk;
  const { data: inserted, error: insertError } = await db
    .from("trader_daily_risk")
    .insert({
      risk_date: riskDate,
      starting_equity: settings.paper_balance,
      realized_pnl: "0",
      daily_loss_limit_hit: false,
      locked_until: null,
      trades_count: 0,
      loss_streak: 0,
    })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return inserted as TraderDailyRisk;
}

async function riskSnapshot(settings: TraderSettings) {
  const [positionsResult, dailyRisk] = await Promise.all([
    adminDb().from("trader_positions").select("*").eq("status", "open"),
    getDailyRisk(settings),
  ]);
  if (positionsResult.error) throw positionsResult.error;
  const positions = (positionsResult.data || []) as TraderPosition[];
  const exposure = positions.reduce(
    (sum, position) => sum + toUnits(position.entry_value || "0"),
    0n,
  );
  return { positions, exposure: fromUnits(exposure), dailyRisk };
}

async function incrementTradeCount() {
  const dailyRisk = await getDailyRisk(await getSettings());
  const { error } = await adminDb()
    .from("trader_daily_risk")
    .update({
      trades_count: Number(dailyRisk.trades_count || 0) + 1,
      updated_at: iso(),
    })
    .eq("risk_date", todayKey());
  if (error) throw error;
}

async function updateDailyRiskAfterClose(
  pnl: string,
  settings: TraderSettings,
) {
  const dailyRisk = await getDailyRisk(settings);
  const realized = fromUnits(
    toUnits(dailyRisk.realized_pnl || "0") + toUnits(pnl),
  );
  const lossAmountHit =
    compareDecimal(
      realized,
      fromUnits(-toUnits(settings.max_daily_loss_amount)),
    ) <= 0;
  const lossPercent =
    compareDecimal(realized, "0") < 0
      ? percentOf(
          fromUnits(-toUnits(realized)),
          dailyRisk.starting_equity || "1",
        )
      : "0";
  const lossPercentHit =
    compareDecimal(lossPercent, settings.max_daily_loss_percent) >= 0;
  const nextLossStreak =
    compareDecimal(pnl, "0") < 0 ? Number(dailyRisk.loss_streak || 0) + 1 : 0;
  const cooldown =
    nextLossStreak >= LOSS_STREAK_THRESHOLD &&
    settings.loss_streak_cooldown_minutes > 0
      ? addMinutes(new Date(), settings.loss_streak_cooldown_minutes)
      : null;
  const lossLimitHit = lossAmountHit || lossPercentHit;
  const lockedUntil =
    lossLimitHit && settings.daily_loss_policy === "next_day"
      ? nextUtcDay().toISOString()
      : cooldown?.toISOString() || dailyRisk.locked_until;
  const { error } = await adminDb()
    .from("trader_daily_risk")
    .update({
      realized_pnl: realized,
      daily_loss_limit_hit: lossLimitHit,
      locked_until: lockedUntil,
      trades_count: Number(dailyRisk.trades_count || 0) + 1,
      loss_streak: nextLossStreak,
      updated_at: iso(),
    })
    .eq("risk_date", todayKey());
  if (error) throw error;
}

async function skipSignal(
  signal: TraderCopySignal,
  reason: string,
  currentPrice?: string | null,
  drift?: string | null,
) {
  await adminDb()
    .from("trader_copy_signals")
    .update({
      status: "skipped",
      current_price: currentPrice || signal.current_price,
      observed_price: currentPrice || signal.observed_price,
      price_drift_percent: drift || signal.price_drift_percent,
      risk_level: "blocked",
      rationale: `${signal.rationale} | Pominięto: ${reason}`.slice(0, 1800),
      updated_at: iso(),
    })
    .eq("id", signal.id);
  return { copied: 0, skipped: 1, reason };
}

async function promoteFomoSignal(
  actor: Actor | null,
  signal: TraderCopySignal,
  ticker: Awaited<
    ReturnType<ReturnType<typeof createMarketProvider>["getTicker"]>
  >,
  settings: TraderSettings,
  ai: Awaited<ReturnType<typeof runTraderAiCouncil>>,
  sourceName: string | null,
) {
  if (!settings.copy_promote_to_live_proposals || signal.side !== "buy")
    return null;
  const db = adminDb();
  const existing = await db
    .from("trader_market_signals")
    .select("id")
    .eq("source_kind", "fomo")
    .eq("source_ref_id", signal.id)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return String(existing.data.id);

  const stopLoss = fromUnits(
    toUnits(ticker.price) -
      toUnits(applyPercent(ticker.price, settings.default_stop_loss_percent)),
  );
  const takeProfitPercent = fromUnits(
    toUnits(settings.default_stop_loss_percent) * 2n,
  );
  const takeProfit = fromUnits(
    toUnits(ticker.price) +
      toUnits(applyPercent(ticker.price, takeProfitPercent)),
  );
  const confidence = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (signal.confidence_score + ai.confidenceScore + signal.source_score) /
          3,
      ),
    ),
  );
  const rationale = [
    `FOMO: ${sourceName || "źródło webhook"} kupił ${signal.symbol}.`,
    signal.rationale,
    `Rada botów OpenAI: ${ai.rationale}`,
    ai.warnings.length ? `Ostrzeżenia: ${ai.warnings.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 3500);

  const { data, error } = await db
    .from("trader_market_signals")
    .insert({
      coin_name:
        signal.symbol.replace(/USDT$|USDC$|FDUSD$/i, "") || signal.symbol,
      symbol: signal.symbol,
      pair: signal.pair,
      exchange: ticker.exchange,
      price: ticker.price,
      price_change_percent: ticker.priceChangePercent,
      volume_24h: ticker.quoteVolume,
      liquidity: ticker.liquidity || ticker.quoteVolume,
      spread_percent: ticker.spreadPercent,
      entry_min: ticker.price,
      entry_max: ticker.price,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      risk_level: ai.riskLevel,
      confidence_score: confidence,
      rationale,
      generated_at: iso(),
      valid_until: signal.expires_at,
      status: "buy",
      source_kind: "fomo",
      source_ref_id: signal.id,
      priority: 100,
      ai_decision: ai.decision,
      ai_confidence_score: ai.confidenceScore,
      ai_summary: ai.rationale.slice(0, 3500),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const duplicate = await db
        .from("trader_market_signals")
        .select("id")
        .eq("source_kind", "fomo")
        .eq("source_ref_id", signal.id)
        .single();
      if (duplicate.error) throw duplicate.error;
      return String(duplicate.data.id);
    }
    throw error;
  }
  await audit(
    actor,
    "trader_fomo_signal_promoted",
    "trader_market_signals",
    String(data.id),
    { copy_signal_id: signal.id, symbol: signal.symbol },
  );
  return String(data.id);
}

async function processFomoSignal(
  actor: Actor | null,
  signal: TraderCopySignal,
) {
  const settings = await getSettings();
  const db = adminDb();
  let source: TraderCopySource | null = null;
  if (signal.source_id) {
    const sourceResult = await db
      .from("trader_copy_sources")
      .select("*")
      .eq("id", signal.source_id)
      .maybeSingle();
    if (sourceResult.error) throw sourceResult.error;
    if (sourceResult.data)
      source = sourceFromRow(sourceResult.data as Record<string, unknown>);
    if (!source?.is_active)
      return skipSignal(signal, "Źródło FOMO jest nieaktywne.");
  }

  const signalAgeSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(signal.detected_at).getTime()) / 1000),
  );
  if (signalAgeSeconds > settings.copy_max_signal_age_seconds)
    return skipSignal(signal, "Sygnał jest zbyt stary.");
  const effectiveSourceScore = source?.source_score ?? signal.source_score;
  if (effectiveSourceScore < settings.copy_min_source_score)
    return skipSignal(signal, "Ocena tradera jest poniżej progu.");
  if (signal.confidence_score < settings.copy_min_confidence_score)
    return skipSignal(signal, "Pewność sygnału jest poniżej progu.");

  const provider = createMarketProvider();
  let ticker;
  try {
    ticker = await provider.getTicker(signal.symbol);
  } catch (error) {
    return skipSignal(
      signal,
      `Rynek ${signal.symbol} nie jest dostępny u skonfigurowanego dostawcy cen.`,
    );
  }
  const drift = absolutePercentDifference(ticker.price, signal.source_price);
  if (compareDecimal(drift, settings.copy_max_price_drift_percent) > 0) {
    return skipSignal(
      signal,
      "Cena uciekła za daleko od ceny źródłowej.",
      ticker.price,
      drift,
    );
  }

  const ai = await runTraderAiCouncil({
    contextType: "fomo_signal",
    contextId: signal.id,
    symbol: signal.symbol,
    pair: signal.pair,
    side: signal.side,
    price: ticker.price,
    priceChangePercent: ticker.priceChangePercent,
    volume24h: ticker.quoteVolume,
    liquidity: ticker.liquidity || ticker.quoteVolume,
    spreadPercent: ticker.spreadPercent,
    deterministicConfidence: signal.confidence_score,
    deterministicRisk: signal.risk_level,
    sourceName: source?.display_name || null,
    sourceScore: effectiveSourceScore,
    sourceWinRate: source?.win_rate_percent || null,
    sourceDrawdown: source?.max_drawdown_percent || null,
    signalAgeSeconds,
    priceDriftPercent: drift,
    rationale: signal.rationale,
  });

  await db
    .from("trader_copy_signals")
    .update({
      observed_price: ticker.price,
      current_price: ticker.price,
      price_drift_percent: drift,
      source_score: effectiveSourceScore,
      ai_decision: ai.decision,
      ai_confidence_score: ai.confidenceScore,
      ai_risk_level: ai.riskLevel,
      ai_rationale: ai.rationale,
      analyzed_at: iso(),
      status: "qualified",
      updated_at: iso(),
    })
    .eq("id", signal.id);

  if (settings.copy_require_ai_review && !ai.available) {
    return skipSignal(
      signal,
      "Wymagana analiza OpenAI, ale żaden aktywny bot nie zwrócił poprawnej decyzji.",
      ticker.price,
      drift,
    );
  }
  if (
    settings.copy_require_ai_review &&
    ai.decision !== "buy" &&
    signal.side === "buy"
  ) {
    return skipSignal(
      signal,
      `Rada botów OpenAI nie zatwierdziła kupna (${ai.decision}).`,
      ticker.price,
      drift,
    );
  }
  if (
    settings.copy_require_ai_review &&
    ai.confidenceScore < settings.copy_min_ai_confidence_score &&
    signal.side === "buy"
  ) {
    return skipSignal(
      signal,
      `Pewność rady OpenAI ${ai.confidenceScore}/100 jest poniżej progu.`,
      ticker.price,
      drift,
    );
  }
  if (ai.riskLevel === "blocked")
    return skipSignal(
      signal,
      "Bot bezpieczeństwa zablokował sygnał.",
      ticker.price,
      drift,
    );

  if (signal.side === "sell") {
    if (!settings.paper_enabled) {
      await db
        .from("trader_copy_signals")
        .update({
          status: "qualified",
          rationale:
            `${signal.rationale} | Sygnał sprzedaży przeanalizowany. Brak paper position do automatycznego zamknięcia.`.slice(
              0,
              1800,
            ),
          updated_at: iso(),
        })
        .eq("id", signal.id);
      return {
        copied: 0,
        promoted: 0,
        skipped: 0,
        qualified: 1,
        side: "sell",
        symbol: signal.symbol,
      };
    }
    let positionQuery = db
      .from("trader_positions")
      .select("*")
      .eq("position_origin", "fomo_copy")
      .eq("status", "open")
      .eq("symbol", signal.symbol)
      .order("opened_at", { ascending: true })
      .limit(1);
    if (signal.source_id)
      positionQuery = positionQuery.eq("copy_source_id", signal.source_id);
    const positionResult = await positionQuery.maybeSingle();
    if (positionResult.error) throw positionResult.error;
    if (!positionResult.data)
      return skipSignal(
        signal,
        "Brak otwartej pozycji paper do zamknięcia.",
        ticker.price,
        drift,
      );
    const position = positionResult.data as TraderPosition;
    const close = calculatePaperClose({
      quantity: position.quantity,
      entryCost: position.entry_value,
      exitPrice: ticker.price,
      spreadPercent: ticker.spreadPercent,
      slippagePercent: settings.max_slippage_percent,
      feePercent: settings.simulated_fee_percent,
    });
    await db
      .from("trader_positions")
      .update({
        status: "closed",
        current_price: ticker.price,
        exit_price: close.effectiveExitPrice,
        current_value: close.netExitValue,
        realized_pnl: close.realizedPnl,
        realized_pnl_percent: close.realizedPnlPercent,
        unrealized_pnl: "0",
        closed_at: iso(),
        updated_at: iso(),
      })
      .eq("id", position.id);
    await db.from("trader_trades").insert({
      owner_id: actor?.id || null,
      position_id: position.id,
      symbol: signal.symbol,
      side: "sell",
      price: close.effectiveExitPrice,
      quantity: position.quantity,
      fee: close.exitFee,
      slippage: settings.max_slippage_percent,
      realized_pnl: close.realizedPnl,
      traded_at: iso(),
    });
    const nextBalance = fromUnits(
      toUnits(settings.paper_balance) + toUnits(close.netExitValue),
    );
    await db
      .from("trader_settings")
      .update({ paper_balance: nextBalance, updated_at: iso() })
      .eq("id", settings.id);
    await updateDailyRiskAfterClose(close.realizedPnl, {
      ...settings,
      paper_balance: nextBalance,
    });
    await db
      .from("trader_copy_signals")
      .update({
        status: "copied",
        copied_position_id: position.id,
        rationale:
          `${signal.rationale} | Paper sell wykonany po analizie OpenAI. P/L: ${close.realizedPnl}.`.slice(
            0,
            1800,
          ),
        updated_at: iso(),
      })
      .eq("id", signal.id);
    await audit(
      actor,
      "trader_copy_position_closed",
      "trader_positions",
      position.id,
      { signal_id: signal.id, symbol: signal.symbol, pnl: close.realizedPnl },
    );
    return {
      copied: 1,
      promoted: 0,
      skipped: 0,
      side: "sell",
      symbol: signal.symbol,
      pnl: close.realizedPnl,
    };
  }

  const promotedSignalId = await promoteFomoSignal(
    actor,
    signal,
    ticker,
    settings,
    ai,
    source?.display_name || null,
  );
  if (!settings.paper_enabled) {
    await db
      .from("trader_copy_signals")
      .update({
        status: promotedSignalId ? "promoted" : "qualified",
        promoted_signal_id: promotedSignalId,
        rationale:
          `${signal.rationale} | Sygnał przeszedł szybką analizę i ${promotedSignalId ? "trafił do wspólnej kolejki decyzji live/testnet" : "pozostał zakwalifikowany"}.`.slice(
            0,
            1800,
          ),
        updated_at: iso(),
      })
      .eq("id", signal.id);
    return {
      copied: 0,
      promoted: promotedSignalId ? 1 : 0,
      skipped: 0,
      side: "buy",
      symbol: signal.symbol,
      promotedSignalId,
    };
  }

  const existingResult = await db
    .from("trader_positions")
    .select("id")
    .eq("position_origin", "fomo_copy")
    .eq("status", "open")
    .eq("symbol", signal.symbol)
    .limit(1);
  if (existingResult.error) throw existingResult.error;
  if ((existingResult.data || []).length)
    return skipSignal(
      signal,
      "Pozycja paper na ten symbol jest już otwarta.",
      ticker.price,
      drift,
    );

  const snapshot = await riskSnapshot(settings);
  const risk = evaluateEntryRisk({
    settings,
    orderValue: settings.copy_position_amount,
    accountBalance: settings.paper_balance,
    currentExposure: snapshot.exposure,
    openPositions: snapshot.positions.length,
    dailyRealizedPnl: snapshot.dailyRisk.realized_pnl,
    startingEquity: snapshot.dailyRisk.starting_equity,
    spreadPercent: ticker.spreadPercent,
    slippagePercent: settings.max_slippage_percent,
    volume24h: ticker.quoteVolume,
    liquidity: ticker.liquidity || ticker.quoteVolume,
    tradesToday: snapshot.dailyRisk.trades_count,
    lockedUntil: snapshot.dailyRisk.locked_until,
  });
  if (!risk.allowed)
    return skipSignal(signal, risk.message, ticker.price, drift);

  const entry = calculatePaperEntry({
    orderValue: settings.copy_position_amount,
    price: ticker.price,
    spreadPercent: ticker.spreadPercent,
    slippagePercent: settings.max_slippage_percent,
    feePercent: settings.simulated_fee_percent,
  });
  if (compareDecimal(settings.paper_balance, entry.entryCost) < 0)
    return skipSignal(
      signal,
      "Saldo paper tradingu jest za niskie.",
      ticker.price,
      drift,
    );
  const stopLoss = fromUnits(
    toUnits(entry.effectiveEntryPrice) -
      toUnits(
        applyPercent(
          entry.effectiveEntryPrice,
          settings.default_stop_loss_percent,
        ),
      ),
  );
  const takeProfitPercent = fromUnits(
    toUnits(settings.default_stop_loss_percent) * 2n,
  );
  const takeProfit = fromUnits(
    toUnits(entry.effectiveEntryPrice) +
      toUnits(applyPercent(entry.effectiveEntryPrice, takeProfitPercent)),
  );
  const { data: positionData, error: positionError } = await db
    .from("trader_positions")
    .insert({
      owner_id: actor?.id || null,
      symbol: signal.symbol,
      pair: signal.pair,
      exchange: ticker.exchange,
      side: "buy",
      status: "open",
      entry_price: entry.effectiveEntryPrice,
      current_price: ticker.price,
      quantity: entry.quantity,
      entry_value: entry.entryCost,
      current_value: settings.copy_position_amount,
      realized_pnl: "0",
      unrealized_pnl: "0",
      realized_pnl_percent: "0",
      stop_loss: stopLoss,
      take_profit: takeProfit,
      opened_at: iso(),
      position_origin: "fomo_copy",
      copy_source_id: signal.source_id,
      copy_signal_id: signal.id,
    })
    .select("*")
    .single();
  if (positionError) throw positionError;
  await db.from("trader_trades").insert({
    owner_id: actor?.id || null,
    position_id: positionData.id,
    symbol: signal.symbol,
    side: "buy",
    price: entry.effectiveEntryPrice,
    quantity: entry.quantity,
    fee: entry.entryFee,
    slippage: settings.max_slippage_percent,
    traded_at: iso(),
  });
  const nextBalance = fromUnits(
    toUnits(settings.paper_balance) - toUnits(entry.entryCost),
  );
  await db
    .from("trader_settings")
    .update({ paper_balance: nextBalance, updated_at: iso() })
    .eq("id", settings.id);
  await incrementTradeCount();
  await db
    .from("trader_copy_signals")
    .update({
      status: "copied",
      promoted_signal_id: promotedSignalId,
      copied_position_id: positionData.id,
      rationale:
        `${signal.rationale} | Paper buy wykonany po kontroli ryzyka i analizie OpenAI${promotedSignalId ? "; sygnał przekazano też do kolejki live/testnet" : ""}.`.slice(
          0,
          1800,
        ),
      updated_at: iso(),
    })
    .eq("id", signal.id);
  await audit(
    actor,
    "trader_copy_position_opened",
    "trader_positions",
    String(positionData.id),
    {
      signal_id: signal.id,
      source_id: signal.source_id,
      symbol: signal.symbol,
      amount: settings.copy_position_amount,
      promoted_signal_id: promotedSignalId,
    },
  );
  return {
    copied: 1,
    promoted: promotedSignalId ? 1 : 0,
    skipped: 0,
    side: "buy",
    symbol: signal.symbol,
    positionId: String(positionData.id),
    promotedSignalId,
  };
}

export async function runFomoCopyEngine(
  actor?: Actor | null,
  preferredSignalId?: string | null,
) {
  const lockId = await acquireSystemLock("trader-paper-account-engine", 4);
  if (!lockId)
    return {
      copied: 0,
      promoted: 0,
      skipped: 0,
      reason: "Inny silnik copy tradingu już działa.",
    };
  try {
    const settings = await getSettings();
    if (!settings.copy_enabled)
      return {
        copied: 0,
        promoted: 0,
        skipped: 0,
        reason: "Analiza sygnałów FOMO jest wyłączona.",
      };
    if (settings.emergency_stop_active)
      return {
        copied: 0,
        promoted: 0,
        skipped: 0,
        reason: "Awaryjne zatrzymanie jest aktywne.",
      };
    const db = adminDb();
    await db
      .from("trader_copy_signals")
      .update({ status: "expired", updated_at: iso() })
      .in("status", ["pending", "qualified"])
      .lte("expires_at", iso());
    const rows: Record<string, unknown>[] = [];
    if (preferredSignalId && /^[0-9a-f-]{36}$/i.test(preferredSignalId)) {
      const preferred = await db
        .from("trader_copy_signals")
        .select("*")
        .eq("id", preferredSignalId)
        .in("status", ["pending", "qualified"])
        .gt("expires_at", iso())
        .maybeSingle();
      if (preferred.error) throw preferred.error;
      if (preferred.data) rows.push(preferred.data as Record<string, unknown>);
    }
    let queue = db
      .from("trader_copy_signals")
      .select("*")
      .in("status", ["pending", "qualified"])
      .gt("expires_at", iso())
      .order("source_score", { ascending: false })
      .order("confidence_score", { ascending: false })
      .order("detected_at", { ascending: false })
      .limit(Math.max(0, 10 - rows.length));
    if (preferredSignalId && rows.length)
      queue = queue.neq("id", preferredSignalId);
    const { data, error } = await queue;
    if (error) throw error;
    rows.push(...((data || []) as Record<string, unknown>[]));
    if (!rows.length)
      return {
        copied: 0,
        promoted: 0,
        skipped: 0,
        reason: "Brak świeżych sygnałów FOMO.",
      };
    const totals = {
      copied: 0,
      promoted: 0,
      skipped: 0,
      processed: 0,
      errors: [] as string[],
    };
    for (const row of rows) {
      try {
        const result = await processFomoSignal(
          actor || null,
          signalFromRow(row),
        );
        totals.copied += Number(result.copied || 0);
        totals.promoted += Number(
          (result as { promoted?: number }).promoted || 0,
        );
        totals.skipped += Number(result.skipped || 0);
      } catch (error) {
        totals.errors.push(
          error instanceof Error
            ? error.message
            : "Nieznany błąd sygnału FOMO.",
        );
      }
      totals.processed += 1;
    }
    return totals;
  } finally {
    await releaseSystemLock("trader-paper-account-engine", lockId);
  }
}
