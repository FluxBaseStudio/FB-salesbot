import "server-only";

import crypto from "crypto";

import type { Balance, Candle, CreateOrderInput, ExchangeMarketProvider, ExchangeOrder, Market, Ticker } from "@/lib/trader/types";
import { compareDecimal, fromUnits, percentOf, subtractDecimal, toUnits } from "@/lib/trader/engine";

type BinanceCredentials = {
  apiKey?: string | null;
  apiSecret?: string | null;
  sandbox?: boolean;
};

type BinanceExchangeInfo = {
  symbols?: BinanceSymbol[];
};

type BinanceSymbol = {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  filters?: Array<{ filterType: string; minNotional?: string; tickSize?: string; stepSize?: string }>;
};

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  bidPrice: string;
  askPrice: string;
};

const MEME_BASE_ASSETS = new Set([
  "DOGE",
  "SHIB",
  "PEPE",
  "BONK",
  "FLOKI",
  "WIF",
  "MEME",
  "TURBO",
  "BOME",
  "PENGU",
  "BABYDOGE",
  "DOGS",
  "NEIRO",
  "1000SATS",
  "SATS",
  "ACT",
  "PNUT",
]);

const QUOTE_PRIORITY = new Set(["USDT", "USDC", "FDUSD"]);

function spreadPercent(bid: string, ask: string) {
  const bidUnits = toUnits(bid);
  const askUnits = toUnits(ask);
  if (bidUnits <= 0n || askUnits <= 0n || askUnits <= bidUnits) return "0";
  const mid = fromUnits((bidUnits + askUnits) / 2n);
  return percentOf(subtractDecimal(ask, bid), mid);
}

function filterValue(symbol: BinanceSymbol, filterType: string, key: "minNotional" | "tickSize" | "stepSize") {
  return symbol.filters?.find((filter) => filter.filterType === filterType)?.[key] || null;
}

export class BinanceSpotProvider implements ExchangeMarketProvider {
  private readonly apiBase: string;
  private readonly apiKey?: string | null;
  private readonly apiSecret?: string | null;

  constructor(credentials: BinanceCredentials = {}) {
    this.apiBase = credentials.sandbox ? "https://testnet.binance.vision" : "https://api.binance.com";
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
  }

  async getMarkets(): Promise<Market[]> {
    const response = await fetch(`${this.apiBase}/api/v3/exchangeInfo`, { cache: "no-store" });
    if (!response.ok) throw new Error("Nie udalo sie pobrac listy rynkow z Binance Spot.");
    const payload = (await response.json()) as BinanceExchangeInfo;
    return (payload.symbols || [])
      .filter((symbol) => symbol.status === "TRADING")
      .filter((symbol) => QUOTE_PRIORITY.has(symbol.quoteAsset))
      .filter((symbol) => MEME_BASE_ASSETS.has(symbol.baseAsset))
      .map((symbol) => ({
        exchange: "binance_spot",
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        quoteAsset: symbol.quoteAsset,
        pair: `${symbol.baseAsset}/${symbol.quoteAsset}`,
        status: symbol.status,
        minNotional: filterValue(symbol, "NOTIONAL", "minNotional") || filterValue(symbol, "MIN_NOTIONAL", "minNotional"),
        tickSize: filterValue(symbol, "PRICE_FILTER", "tickSize"),
        stepSize: filterValue(symbol, "LOT_SIZE", "stepSize"),
      }));
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const response = await fetch(`${this.apiBase}/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Nie udalo sie pobrac tickera dla ${symbol}.`);
    const payload = (await response.json()) as BinanceTicker;
    const marketSymbol = payload.symbol || symbol;
    const bid = payload.bidPrice || "0";
    const ask = payload.askPrice || "0";
    return {
      exchange: "binance_spot",
      symbol: marketSymbol,
      pair: marketSymbol.replace(/(USDT|USDC|FDUSD)$/i, "/$1"),
      price: payload.lastPrice,
      priceChangePercent: payload.priceChangePercent,
      volume: payload.volume,
      quoteVolume: payload.quoteVolume,
      bid,
      ask,
      spreadPercent: spreadPercent(bid, ask),
      liquidity: payload.quoteVolume,
      generatedAt: new Date().toISOString(),
    };
  }

  async getCandles(symbol: string, timeframe: string): Promise<Candle[]> {
    const safeTimeframe = ["1m", "5m", "15m", "1h", "4h", "1d"].includes(timeframe) ? timeframe : "1h";
    const response = await fetch(`${this.apiBase}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${safeTimeframe}&limit=120`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Nie udalo sie pobrac swiec dla ${symbol}.`);
    const payload = (await response.json()) as unknown[][];
    return payload.map((row) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: String(row[1]),
      high: String(row[2]),
      low: String(row[3]),
      close: String(row[4]),
      volume: String(row[5]),
    }));
  }

  async getBalance(): Promise<Balance[]> {
    const payload = await this.signedRequest<{ balances?: Balance[] }>("/api/v3/account", "GET");
    return (payload.balances || []).filter((balance) => compareDecimal(balance.free, "0") > 0 || compareDecimal(balance.locked, "0") > 0);
  }

  async createOrder(order: CreateOrderInput): Promise<ExchangeOrder> {
    const payload: Record<string, string> = {
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      type: order.type.toUpperCase(),
      newClientOrderId: order.clientOrderId,
    };
    if (order.quantity) payload.quantity = order.quantity;
    if (order.quoteOrderQty) payload.quoteOrderQty = order.quoteOrderQty;
    if (order.price) {
      payload.price = order.price;
      payload.timeInForce = "GTC";
    }
    const result = await this.signedRequest<Record<string, unknown>>("/api/v3/order", "POST", payload);
    return {
      exchange: "binance_spot",
      orderId: String(result.orderId || ""),
      clientOrderId: String(result.clientOrderId || order.clientOrderId),
      symbol: String(result.symbol || order.symbol),
      side: order.side,
      type: order.type,
      status: String(result.status || "submitted"),
      executedQty: result.executedQty ? String(result.executedQty) : null,
      cummulativeQuoteQty: result.cummulativeQuoteQty ? String(result.cummulativeQuoteQty) : null,
      raw: result,
    };
  }

  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    await this.signedRequest("/api/v3/order", "DELETE", { symbol, orderId });
  }

  private async signedRequest<T>(path: string, method: "GET" | "POST" | "DELETE", params: Record<string, string> = {}): Promise<T> {
    if (!this.apiKey || !this.apiSecret) throw new Error("Brak klucza API gieldy do prywatnego endpointu.");
    const search = new URLSearchParams({ ...params, recvWindow: "5000", timestamp: Date.now().toString() });
    const signature = crypto.createHmac("sha256", this.apiSecret).update(search.toString()).digest("hex");
    search.set("signature", signature);
    const body = method === "GET" || method === "DELETE" ? undefined : search;
    const url = method === "GET" || method === "DELETE"
      ? `${this.apiBase}${path}?${search.toString()}`
      : `${this.apiBase}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        "X-MBX-APIKEY": this.apiKey,
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body,
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = typeof payload === "object" && payload && "msg" in payload ? String(payload.msg) : "Blad prywatnego endpointu gieldy.";
      throw new Error(message);
    }
    return response.json() as Promise<T>;
  }
}

export function createMarketProvider(input?: { exchangeName?: string | null; apiKey?: string | null; apiSecret?: string | null; sandbox?: boolean }) {
  const exchangeName = input?.exchangeName || "binance_spot";
  if (exchangeName !== "binance_spot") throw new Error("Pierwsza wersja TraderBota obsluguje Binance Spot.");
  return new BinanceSpotProvider({ apiKey: input?.apiKey, apiSecret: input?.apiSecret, sandbox: input?.sandbox });
}
