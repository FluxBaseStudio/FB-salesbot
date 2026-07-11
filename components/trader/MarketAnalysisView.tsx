"use client";

import {
  EmptyState,
  Notice,
  Panel,
  StatusBadge,
  TableCard,
} from "@/components/admin/ui";
import CoinChart from "@/components/trader/CoinChart";
import { traderCopy } from "@/components/trader/copy";
import {
  formatDateTime,
  formatDecimal,
  formatMoney,
} from "@/components/trader/format";
import type { Candle, TraderMarketSignal } from "@/lib/trader/types";

export default function MarketAnalysisView({
  signals,
  candles,
  selectedSymbol,
  timeframe,
  busy,
  onScan,
  onSelectSymbol,
  onTimeframeChange,
}: {
  signals: TraderMarketSignal[];
  candles: Candle[];
  selectedSymbol: string | null;
  timeframe: string;
  busy: boolean;
  onScan: () => void;
  onSelectSymbol: (symbol: string) => void;
  onTimeframeChange: (timeframe: string) => void;
}) {
  const selected =
    signals.find((signal) => signal.symbol === selectedSymbol) ||
    signals[0] ||
    null;
  return (
    <>
      <Panel
        eyebrow="Analiza rynku"
        title="Sygnały systemu dla memcoinów"
        footer={
          <div className="trader-panel-actions">
            <select
              value={timeframe}
              onChange={(event) => onTimeframeChange(event.target.value)}
              aria-label="Interwał wykresu"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
            <button
              className="button primary"
              type="button"
              onClick={onScan}
              disabled={busy}
            >
              {busy ? "Skanuję..." : "Skanuj rynek"}
            </button>
          </div>
        }
      >
        {!signals.length ? (
          <EmptyState>
            Brak sygnałów. Uruchom skan rynku po wykonaniu migracji i
            skonfigurowaniu środowiska.
          </EmptyState>
        ) : (
          <TableCard
            rows={signals}
            empty="Brak sygnałów."
            columns={[
              "Coin",
              "Źródło",
              "Rynek",
              "Cena",
              "Wolumen",
              "Spread",
              "Ryzyko",
              "Status",
              "Ważny do",
            ]}
            render={(signal) => (
              <tr key={signal.id || signal.symbol}>
                <td>
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => onSelectSymbol(signal.symbol)}
                  >
                    {signal.coin_name}
                  </button>
                  <span>{signal.symbol}</span>
                </td>
                <td>
                  {signal.source_kind === "fomo" ? "FOMO" : "Skan rynku"}
                  <span>
                    {signal.ai_decision
                      ? `OpenAI: ${signal.ai_decision} ${signal.ai_confidence_score ?? 0}/100`
                      : "bez rady OpenAI"}
                  </span>
                </td>
                <td>
                  {signal.pair}
                  <span>{signal.exchange}</span>
                </td>
                <td>
                  {formatMoney(signal.price)}
                  <span>{formatDecimal(signal.price_change_percent, 2)}%</span>
                </td>
                <td>{formatMoney(signal.volume_24h)}</td>
                <td>{formatDecimal(signal.spread_percent, 4)}%</td>
                <td>
                  <StatusBadge status={signal.risk_level}>
                    {traderCopy.pl.statuses[signal.risk_level]}
                  </StatusBadge>
                  <span>{signal.confidence_score}% pewności</span>
                </td>
                <td>
                  <StatusBadge status={signal.status}>
                    {traderCopy.pl.statuses[signal.status]}
                  </StatusBadge>
                </td>
                <td>{formatDateTime(signal.valid_until)}</td>
              </tr>
            )}
          />
        )}
      </Panel>
      {selected ? (
        <Panel
          eyebrow={selected.pair}
          title="Wykres świecowy i poziomy strategii"
        >
          <CoinChart
            candles={candles}
            entry={selected.entry_min}
            stopLoss={selected.stop_loss}
            takeProfit={selected.take_profit}
            currentPrice={selected.price}
          />
          <Notice tone="info">{selected.rationale}</Notice>
          {selected.ai_summary ? (
            <Notice tone="warning">
              Rada botów OpenAI: {selected.ai_summary}
            </Notice>
          ) : null}
        </Panel>
      ) : null}
    </>
  );
}
