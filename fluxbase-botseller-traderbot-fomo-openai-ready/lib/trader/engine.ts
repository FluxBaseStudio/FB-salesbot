import type { TraderTradingMode } from "@/lib/trader/types";

const SCALE = 1000000000000n;
const SCALE_DIGITS = 12;

export type DecimalLike = string | number | bigint | null | undefined;

export type PaperEntryInput = {
  orderValue: DecimalLike;
  price: DecimalLike;
  spreadPercent?: DecimalLike;
  slippagePercent?: DecimalLike;
  feePercent?: DecimalLike;
};

export type PaperCloseInput = {
  quantity: DecimalLike;
  entryCost: DecimalLike;
  exitPrice: DecimalLike;
  spreadPercent?: DecimalLike;
  slippagePercent?: DecimalLike;
  feePercent?: DecimalLike;
};

export type PaperEntryResult = {
  effectiveEntryPrice: string;
  quantity: string;
  entryFee: string;
  entryCost: string;
};

export type PaperCloseResult = {
  effectiveExitPrice: string;
  grossExitValue: string;
  exitFee: string;
  netExitValue: string;
  realizedPnl: string;
  realizedPnlPercent: string;
};

export type RiskEvaluationInput = {
  settings: {
    emergency_stop_active?: boolean;
    max_entry_amount?: DecimalLike;
    max_balance_percent_per_position?: DecimalLike;
    max_daily_loss_amount?: DecimalLike;
    max_daily_loss_percent?: DecimalLike;
    max_open_positions?: number | null;
    max_total_exposure?: DecimalLike;
    max_spread_percent?: DecimalLike;
    max_slippage_percent?: DecimalLike;
    min_volume_24h?: DecimalLike;
    min_liquidity?: DecimalLike;
    max_daily_trades?: number | null;
  };
  orderValue: DecimalLike;
  accountBalance: DecimalLike;
  currentExposure: DecimalLike;
  openPositions: number;
  dailyRealizedPnl: DecimalLike;
  startingEquity: DecimalLike;
  spreadPercent: DecimalLike;
  slippagePercent: DecimalLike;
  volume24h: DecimalLike;
  liquidity?: DecimalLike;
  tradesToday?: number;
  lockedUntil?: string | null;
  now?: Date | string;
};

export type RiskDecision = {
  allowed: boolean;
  code: string;
  message: string;
};

export type LiveExecutionInput = {
  liveTradingEnabled: boolean;
  exchangeConnected: boolean;
  tradingMode: TraderTradingMode;
  approvalRequired: boolean;
  approved: boolean;
  approvalExpiresAt?: string | null;
  now?: Date | string;
  riskDecision: RiskDecision;
  idempotencyAlreadyUsed: boolean;
  emergencyStopActive: boolean;
};

function normalizeDecimal(value: DecimalLike): string {
  if (value === null || value === undefined || value === "") return "0";
  if (typeof value === "bigint") return value.toString();
  const raw = typeof value === "number" ? value.toString() : String(value);
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return "0";
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) throw new Error(`Nieprawidlowy format kwoty: ${raw}`);
  return normalized;
}

export function toUnits(value: DecimalLike): bigint {
  const normalized = normalizeDecimal(value);
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholeRaw, fractionRaw = ""] = unsigned.split(".");
  const whole = BigInt(wholeRaw || "0") * SCALE;
  const fraction = BigInt(fractionRaw.padEnd(SCALE_DIGITS, "0").slice(0, SCALE_DIGITS) || "0");
  const units = whole + fraction;
  return negative ? -units : units;
}

export function fromUnits(units: bigint, decimals = SCALE_DIGITS): string {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const whole = absolute / SCALE;
  const fraction = (absolute % SCALE).toString().padStart(SCALE_DIGITS, "0");
  const trimmed = decimals <= 0 ? "" : fraction.slice(0, decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${trimmed ? `.${trimmed}` : ""}`;
}

export function addDecimal(a: DecimalLike, b: DecimalLike) {
  return fromUnits(toUnits(a) + toUnits(b));
}

export function subtractDecimal(a: DecimalLike, b: DecimalLike) {
  return fromUnits(toUnits(a) - toUnits(b));
}

export function multiplyDecimal(a: DecimalLike, b: DecimalLike) {
  return fromUnits((toUnits(a) * toUnits(b)) / SCALE);
}

export function divideDecimal(a: DecimalLike, b: DecimalLike) {
  const divisor = toUnits(b);
  if (divisor === 0n) throw new Error("Dzielenie przez zero.");
  return fromUnits((toUnits(a) * SCALE) / divisor);
}

export function compareDecimal(a: DecimalLike, b: DecimalLike) {
  const left = toUnits(a);
  const right = toUnits(b);
  return left === right ? 0 : left > right ? 1 : -1;
}

export function absDecimal(value: DecimalLike) {
  const units = toUnits(value);
  return fromUnits(units < 0n ? -units : units);
}

export function applyPercent(amount: DecimalLike, percent: DecimalLike) {
  const units = toUnits(amount);
  const percentUnits = toUnits(percent);
  return fromUnits((units * percentUnits) / (SCALE * 100n));
}

export function percentOf(part: DecimalLike, total: DecimalLike) {
  const totalUnits = toUnits(total);
  if (totalUnits === 0n) return "0";
  return fromUnits((toUnits(part) * 100n * SCALE) / totalUnits);
}

export function absolutePercentDifference(current: DecimalLike, reference: DecimalLike) {
  const referenceUnits = toUnits(reference);
  if (referenceUnits <= 0n) return "999";
  const difference = toUnits(current) - referenceUnits;
  const absoluteDifference = difference < 0n ? -difference : difference;
  return fromUnits((absoluteDifference * 100n * SCALE) / referenceUnits, 6);
}

function applySignedPercent(base: DecimalLike, percent: DecimalLike, direction: "up" | "down") {
  const delta = toUnits(applyPercent(base, percent));
  const baseUnits = toUnits(base);
  return fromUnits(direction === "up" ? baseUnits + delta : baseUnits - delta);
}

function combinedExecutionPercent(spreadPercent?: DecimalLike, slippagePercent?: DecimalLike) {
  return fromUnits(toUnits(spreadPercent) + toUnits(slippagePercent));
}

export function calculatePaperEntry(input: PaperEntryInput): PaperEntryResult {
  const orderValue = toUnits(input.orderValue);
  const price = toUnits(input.price);
  if (orderValue <= 0n) throw new Error("Kwota wejscia musi byc dodatnia.");
  if (price <= 0n) throw new Error("Cena wejscia musi byc dodatnia.");

  const executionPercent = combinedExecutionPercent(input.spreadPercent, input.slippagePercent);
  const effectiveEntryPrice = applySignedPercent(input.price, executionPercent, "up");
  const quantity = fromUnits((orderValue * SCALE) / toUnits(effectiveEntryPrice));
  const entryFee = applyPercent(input.orderValue, input.feePercent);
  const entryCost = fromUnits(orderValue + toUnits(entryFee));

  return {
    effectiveEntryPrice,
    quantity,
    entryFee,
    entryCost,
  };
}

export function calculatePaperClose(input: PaperCloseInput): PaperCloseResult {
  const quantity = toUnits(input.quantity);
  const entryCost = toUnits(input.entryCost);
  const exitPrice = toUnits(input.exitPrice);
  if (quantity <= 0n) throw new Error("Ilosc tokenow musi byc dodatnia.");
  if (entryCost <= 0n) throw new Error("Koszt wejscia musi byc dodatni.");
  if (exitPrice <= 0n) throw new Error("Cena wyjscia musi byc dodatnia.");

  const executionPercent = combinedExecutionPercent(input.spreadPercent, input.slippagePercent);
  const effectiveExitPrice = applySignedPercent(input.exitPrice, executionPercent, "down");
  const grossExitValue = fromUnits((quantity * toUnits(effectiveExitPrice)) / SCALE);
  const exitFee = applyPercent(grossExitValue, input.feePercent);
  const netExitValue = fromUnits(toUnits(grossExitValue) - toUnits(exitFee));
  const realizedPnlUnits = toUnits(netExitValue) - entryCost;
  const realizedPnl = fromUnits(realizedPnlUnits);
  const realizedPnlPercent = percentOf(realizedPnl, input.entryCost);

  return {
    effectiveExitPrice,
    grossExitValue,
    exitFee,
    netExitValue,
    realizedPnl,
    realizedPnlPercent,
  };
}

function block(code: string, message: string): RiskDecision {
  return { allowed: false, code, message };
}

function allow(): RiskDecision {
  return { allowed: true, code: "OK", message: "Kontrola ryzyka zaliczona." };
}

export function evaluateEntryRisk(input: RiskEvaluationInput): RiskDecision {
  const { settings } = input;
  if (settings.emergency_stop_active) return block("EMERGENCY_STOP", "Awaryjne zatrzymanie blokuje nowe wejscia.");
  if (input.lockedUntil) {
    const nowDate = typeof input.now === "string" ? new Date(input.now) : input.now || new Date();
    const lockedUntil = new Date(input.lockedUntil);
    if (!Number.isNaN(lockedUntil.getTime()) && lockedUntil.getTime() > nowDate.getTime()) {
      return block("RISK_COOLDOWN", `Nowe wejscia sa zablokowane do ${lockedUntil.toISOString()}.`);
    }
  }

  const orderValue = toUnits(input.orderValue);
  if (orderValue <= 0n) return block("INVALID_AMOUNT", "Kwota wejscia musi byc dodatnia.");

  const maxEntry = toUnits(settings.max_entry_amount);
  if (maxEntry > 0n && orderValue > maxEntry) return block("MAX_ENTRY_AMOUNT", "Kwota przekracza limit pojedynczego wejscia.");

  const accountBalance = toUnits(input.accountBalance);
  if (accountBalance <= 0n) return block("NO_BALANCE", "Brak dodatniego salda do oceny ryzyka.");

  const orderPercent = percentOf(input.orderValue, input.accountBalance);
  const maxBalancePercent = toUnits(settings.max_balance_percent_per_position);
  if (maxBalancePercent > 0n && toUnits(orderPercent) > maxBalancePercent) {
    return block("MAX_BALANCE_PERCENT", "Pozycja przekracza maksymalny procent salda.");
  }

  const maxOpenPositions = Number(settings.max_open_positions || 0);
  if (maxOpenPositions > 0 && input.openPositions >= maxOpenPositions) {
    return block("MAX_OPEN_POSITIONS", "Osiagnieto maksymalna liczbe otwartych pozycji.");
  }

  const maxExposure = toUnits(settings.max_total_exposure);
  if (maxExposure > 0n && toUnits(input.currentExposure) + orderValue > maxExposure) {
    return block("MAX_TOTAL_EXPOSURE", "Laczna ekspozycja przekracza limit.");
  }

  const maxDailyLossAmount = toUnits(settings.max_daily_loss_amount);
  const dailyPnl = toUnits(input.dailyRealizedPnl);
  if (maxDailyLossAmount > 0n && dailyPnl <= -maxDailyLossAmount) {
    return block("MAX_DAILY_LOSS_AMOUNT", "Osiagnieto dzienny limit straty.");
  }

  const startingEquity = toUnits(input.startingEquity);
  const maxDailyLossPercent = toUnits(settings.max_daily_loss_percent);
  if (startingEquity > 0n && maxDailyLossPercent > 0n && dailyPnl < 0n) {
    const lossPercent = toUnits(percentOf(fromUnits(-dailyPnl), input.startingEquity));
    if (lossPercent >= maxDailyLossPercent) return block("MAX_DAILY_LOSS_PERCENT", "Osiagnieto procentowy dzienny limit straty.");
  }

  const maxTrades = Number(settings.max_daily_trades || 0);
  if (maxTrades > 0 && Number(input.tradesToday || 0) >= maxTrades) {
    return block("MAX_DAILY_TRADES", "Osiagnieto dzienny limit transakcji.");
  }

  if (compareDecimal(input.spreadPercent, settings.max_spread_percent) > 0) {
    return block("MAX_SPREAD", "Spread przekracza dopuszczalny limit.");
  }

  if (compareDecimal(input.slippagePercent, settings.max_slippage_percent) > 0) {
    return block("MAX_SLIPPAGE", "Poslizg przekracza dopuszczalny limit.");
  }

  if (compareDecimal(input.volume24h, settings.min_volume_24h) < 0) {
    return block("MIN_VOLUME", "Wolumen jest ponizej minimalnego progu.");
  }

  const minLiquidity = toUnits(settings.min_liquidity);
  if (minLiquidity > 0n && compareDecimal(input.liquidity || "0", settings.min_liquidity) < 0) {
    return block("MIN_LIQUIDITY", "Plynnosc jest ponizej minimalnego progu.");
  }

  return allow();
}

export function isApprovalExpired(expiresAt?: string | null, now: Date | string = new Date()) {
  if (!expiresAt) return false;
  const nowDate = typeof now === "string" ? new Date(now) : now;
  const expires = new Date(expiresAt);
  return Number.isNaN(expires.getTime()) || expires.getTime() <= nowDate.getTime();
}

export function createOrderIdempotencyKey(input: { approvalId?: string | null; signalId?: string | null; symbol: string; side: string; bucket?: string | null }) {
  const source = input.approvalId || input.signalId || "manual";
  return ["trader", source, input.symbol.toUpperCase(), input.side.toLowerCase(), input.bucket || "spot"].join(":");
}

export function evaluateLiveExecution(input: LiveExecutionInput): RiskDecision {
  if (!input.liveTradingEnabled) return block("LIVE_TRADING_DISABLED_ENV", "LIVE_TRADING_ENABLED nie ma wartosci true.");
  if (input.emergencyStopActive) return block("EMERGENCY_STOP", "Awaryjne zatrzymanie blokuje wykonanie zlecenia.");
  if (!input.exchangeConnected) return block("EXCHANGE_NOT_CONNECTED", "Brak poprawnego polaczenia z gielda.");
  if (input.tradingMode === "disabled") return block("TRADING_MODE_DISABLED", "Automatyczny trading jest wylaczony.");
  if (input.approvalRequired && !input.approved) return block("APPROVAL_REQUIRED", "Zlecenie wymaga akceptacji administratora.");
  if (input.approvalRequired && isApprovalExpired(input.approvalExpiresAt, input.now)) return block("APPROVAL_EXPIRED", "Propozycja zlecenia wygasla.");
  if (!input.riskDecision.allowed) return input.riskDecision;
  if (input.idempotencyAlreadyUsed) return block("IDEMPOTENCY_USED", "Ten klucz idempotencji zostal juz wykorzystany.");
  return allow();
}
