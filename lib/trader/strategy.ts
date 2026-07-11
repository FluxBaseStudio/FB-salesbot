import "server-only";

import type { Candle, ExchangeMarketProvider, Ticker, TraderMarketSignal, TraderSettings } from "@/lib/trader/types";
import { applyPercent, compareDecimal, fromUnits, toUnits } from "@/lib/trader/engine";

function baseName(pair: string) {
  return pair.split("/")[0] || pair;
}

function average(values: bigint[]) {
  if (!values.length) return 0n;
  return values.reduce((sum, item) => sum + item, 0n) / BigInt(values.length);
}

function priceWithPercent(price: string, percent: string, direction: "up" | "down") {
  const delta = toUnits(applyPercent(price, percent));
  const priceUnits = toUnits(price);
  return fromUnits(direction === "up" ? priceUnits + delta : priceUnits - delta);
}

function riskLevel(ticker: Ticker, settings: TraderSettings) {
  if (compareDecimal(ticker.spreadPercent, settings.max_spread_percent) > 0) return "blocked";
  if (compareDecimal(ticker.quoteVolume, settings.min_volume_24h) < 0) return "blocked";
  if (compareDecimal(ticker.priceChangePercent, "25") > 0 || compareDecimal(ticker.priceChangePercent, "-18") < 0) return "high";
  if (compareDecimal(ticker.spreadPercent, "0.8") > 0) return "medium";
  return "low";
}

function signalStatus(ticker: Ticker, candles: Candle[], risk: TraderMarketSignal["risk_level"]) {
  if (risk === "blocked") return "rejected";
  const closes = candles.map((candle) => toUnits(candle.close));
  const lastClose = closes.at(-1) || toUnits(ticker.price);
  const shortAverage = average(closes.slice(-8));
  const longAverage = average(closes.slice(-30));
  if (shortAverage > longAverage && compareDecimal(ticker.priceChangePercent, "0") > 0) return "buy";
  if (lastClose < longAverage && compareDecimal(ticker.priceChangePercent, "-4") < 0) return "sell";
  if (shortAverage >= longAverage) return "hold";
  return "watch";
}

function confidence(ticker: Ticker, candles: Candle[], risk: TraderMarketSignal["risk_level"]) {
  if (risk === "blocked") return 15;
  const volumeScore = compareDecimal(ticker.quoteVolume, "1000000") > 0 ? 25 : 12;
  const spreadScore = compareDecimal(ticker.spreadPercent, "0.5") <= 0 ? 25 : 12;
  const candlesScore = candles.length >= 60 ? 25 : 12;
  const momentumScore = compareDecimal(ticker.priceChangePercent, "0") > 0 ? 20 : 10;
  const riskPenalty = risk === "high" ? 20 : risk === "medium" ? 8 : 0;
  return Math.max(5, Math.min(95, volumeScore + spreadScore + candlesScore + momentumScore - riskPenalty));
}

function rationale(ticker: Ticker, status: TraderMarketSignal["status"], risk: TraderMarketSignal["risk_level"]) {
  const parts = [
    `Sygnał systemu na bazie rzeczywistego tickera ${ticker.exchange}.`,
    `Zmiana 24h: ${ticker.priceChangePercent}%, wolumen quote: ${ticker.quoteVolume}, spread: ${ticker.spreadPercent}%.`,
  ];
  if (status === "buy") parts.push("Propozycja wejścia pojawia się po dodatnim momentum i akceptowalnym spreadzie.");
  if (status === "watch") parts.push("Rynek wymaga obserwacji, bo momentum lub wolumen nie dają jeszcze czytelnej przewagi.");
  if (status === "sell") parts.push("System widzi pogorszenie momentum i sygnał wyjścia/ochrony pozycji.");
  if (risk === "blocked") parts.push("Ocena ryzyka blokuje wejście zgodnie z limitami konfiguracji.");
  return parts.join(" ");
}

export async function buildMarketSignal(provider: ExchangeMarketProvider, symbol: string, settings: TraderSettings): Promise<TraderMarketSignal> {
  const [ticker, candles] = await Promise.all([
    provider.getTicker(symbol),
    provider.getCandles(symbol, "1h"),
  ]);
  const risk = riskLevel(ticker, settings);
  const status = signalStatus(ticker, candles, risk);
  const now = new Date();
  const validUntil = new Date(now.getTime() + 30 * 60 * 1000);
  const entryMin = priceWithPercent(ticker.price, "0.4", "down");
  const entryMax = priceWithPercent(ticker.price, "0.4", "up");
  const stopLoss = priceWithPercent(ticker.price, settings.default_stop_loss_percent, "down");
  const takeProfit = priceWithPercent(ticker.price, "9", "up");

  return {
    id: "",
    coin_name: baseName(ticker.pair),
    symbol: ticker.symbol,
    pair: ticker.pair,
    exchange: ticker.exchange,
    price: ticker.price,
    price_change_percent: ticker.priceChangePercent,
    volume_24h: ticker.quoteVolume,
    liquidity: ticker.liquidity || null,
    spread_percent: ticker.spreadPercent,
    entry_min: entryMin,
    entry_max: entryMax,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    risk_level: risk,
    confidence_score: confidence(ticker, candles, risk),
    rationale: rationale(ticker, status, risk),
    generated_at: now.toISOString(),
    valid_until: validUntil.toISOString(),
    status,
  };
}

export async function scanMemecoinMarkets(provider: ExchangeMarketProvider, settings: TraderSettings, limit = 12) {
  const markets = await provider.getMarkets();
  const unique = new Map<string, string>();
  for (const market of markets) {
    if (!unique.has(market.baseAsset)) unique.set(market.baseAsset, market.symbol);
  }
  const symbols = Array.from(unique.values()).slice(0, limit);
  const signals: TraderMarketSignal[] = [];
  for (const symbol of symbols) {
    try {
      signals.push(await buildMarketSignal(provider, symbol, settings));
    } catch (error) {
      console.error("trader market signal failed", symbol, error instanceof Error ? error.message : error);
    }
  }
  return signals;
}
