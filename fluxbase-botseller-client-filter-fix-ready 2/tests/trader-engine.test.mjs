import assert from 'node:assert/strict';

const engine = await import('../lib/trader/engine.ts');

const {
  calculatePaperEntry,
  calculatePaperClose,
  createOrderIdempotencyKey,
  evaluateEntryRisk,
  evaluateLiveExecution,
  isApprovalExpired,
} = engine;

const baseSettings = {
  emergency_stop_active: false,
  max_entry_amount: '1000',
  max_balance_percent_per_position: '20',
  max_daily_loss_amount: '250',
  max_daily_loss_percent: '5',
  max_open_positions: 5,
  max_total_exposure: '2500',
  max_spread_percent: '1.5',
  max_slippage_percent: '0.75',
  min_volume_24h: '100000',
  min_liquidity: '0',
  max_daily_trades: 10,
};

function risk(overrides = {}) {
  return evaluateEntryRisk({
    settings: { ...baseSettings, ...(overrides.settings || {}) },
    orderValue: '500',
    accountBalance: '10000',
    currentExposure: '500',
    openPositions: 1,
    dailyRealizedPnl: '0',
    startingEquity: '10000',
    spreadPercent: '0.4',
    slippagePercent: '0.2',
    volume24h: '500000',
    liquidity: '0',
    tradesToday: 1,
    ...overrides,
  });
}

const entry = calculatePaperEntry({ orderValue: '1000', price: '10', feePercent: '0.1', spreadPercent: '0', slippagePercent: '0' });
assert.equal(entry.quantity, '100');
assert.equal(entry.entryFee, '1');
assert.equal(entry.entryCost, '1001');

const close = calculatePaperClose({ quantity: entry.quantity, entryCost: entry.entryCost, exitPrice: '12', feePercent: '0.1', spreadPercent: '0', slippagePercent: '0' });
assert.equal(close.grossExitValue, '1200');
assert.equal(close.exitFee, '1.2');
assert.equal(close.realizedPnl, '197.8');

const slippedEntry = calculatePaperEntry({ orderValue: '1020', price: '10', spreadPercent: '1', slippagePercent: '1', feePercent: '0' });
assert.equal(slippedEntry.effectiveEntryPrice, '10.2');
assert.equal(slippedEntry.quantity, '100');

const slippedClose = calculatePaperClose({ quantity: '100', entryCost: '1000', exitPrice: '10', spreadPercent: '1', slippagePercent: '1', feePercent: '0' });
assert.equal(slippedClose.effectiveExitPrice, '9.8');
assert.equal(slippedClose.realizedPnl, '-20');

assert.equal(risk({ dailyRealizedPnl: '-250' }).code, 'MAX_DAILY_LOSS_AMOUNT');
assert.equal(risk({ openPositions: 5 }).code, 'MAX_OPEN_POSITIONS');
assert.equal(risk({ spreadPercent: '2' }).code, 'MAX_SPREAD');
assert.equal(risk({ settings: { emergency_stop_active: true } }).code, 'EMERGENCY_STOP');

const okRisk = risk();
assert.equal(okRisk.allowed, true);

assert.equal(
  evaluateLiveExecution({
    liveTradingEnabled: false,
    exchangeConnected: true,
    tradingMode: 'automatic',
    approvalRequired: false,
    approved: true,
    riskDecision: okRisk,
    idempotencyAlreadyUsed: false,
    emergencyStopActive: false,
  }).code,
  'LIVE_TRADING_DISABLED_ENV'
);

assert.equal(isApprovalExpired('2026-07-11T10:00:00.000Z', '2026-07-11T10:00:01.000Z'), true);
assert.equal(
  evaluateLiveExecution({
    liveTradingEnabled: true,
    exchangeConnected: true,
    tradingMode: 'approval_required',
    approvalRequired: true,
    approved: true,
    approvalExpiresAt: '2026-07-11T10:00:00.000Z',
    now: '2026-07-11T10:00:01.000Z',
    riskDecision: okRisk,
    idempotencyAlreadyUsed: false,
    emergencyStopActive: false,
  }).code,
  'APPROVAL_EXPIRED'
);

const keyA = createOrderIdempotencyKey({ approvalId: 'approval-1', symbol: 'PEPEUSDT', side: 'buy' });
const keyB = createOrderIdempotencyKey({ approvalId: 'approval-1', symbol: 'PEPEUSDT', side: 'buy' });
assert.equal(keyA, keyB);
assert.equal(
  evaluateLiveExecution({
    liveTradingEnabled: true,
    exchangeConnected: true,
    tradingMode: 'automatic',
    approvalRequired: false,
    approved: true,
    riskDecision: okRisk,
    idempotencyAlreadyUsed: true,
    emergencyStopActive: false,
  }).code,
  'IDEMPOTENCY_USED'
);

assert.equal(
  evaluateLiveExecution({
    liveTradingEnabled: true,
    exchangeConnected: true,
    tradingMode: 'automatic',
    approvalRequired: false,
    approved: true,
    riskDecision: risk({ spreadPercent: '3' }),
    idempotencyAlreadyUsed: false,
    emergencyStopActive: false,
  }).code,
  'MAX_SPREAD'
);

assert.equal(
  evaluateLiveExecution({
    liveTradingEnabled: true,
    exchangeConnected: true,
    tradingMode: 'automatic',
    approvalRequired: false,
    approved: true,
    riskDecision: okRisk,
    idempotencyAlreadyUsed: false,
    emergencyStopActive: true,
  }).code,
  'EMERGENCY_STOP'
);

console.log('trader-engine tests passed');
