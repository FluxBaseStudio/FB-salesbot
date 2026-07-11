"use client";

import { MetricCard, Notice, Panel, StatusBadge } from "@/components/admin/ui";
import { traderCopy } from "@/components/trader/copy";
import { formatMoney } from "@/components/trader/format";
import type { TraderOverview } from "@/lib/trader/types";

export default function LiveTradingView({
  overview,
  busy,
  onStartApproval,
  onStartAutomatic,
  onStop,
}: {
  overview: TraderOverview;
  busy: boolean;
  onStartApproval: () => void;
  onStartAutomatic: () => void;
  onStop: () => void;
}) {
  const mode = overview.settings.trading_mode;
  return (
    <Panel
      eyebrow="Automatyczny trading"
      title="Tryb live i zabezpieczenia"
      footer={
        <div className="trader-panel-actions">
          <button className="button primary" type="button" onClick={onStartApproval} disabled={busy}>Włącz z akceptacją</button>
          <button className="button danger-soft" type="button" onClick={onStartAutomatic} disabled={busy}>Włącz automatyczny</button>
          <button className="button" type="button" onClick={onStop} disabled={busy || mode === "disabled"}>Wyłącz live</button>
        </div>
      }
    >
      <div className="metrics-grid compact-metrics">
        <MetricCard label="Tryb" value={traderCopy.pl.statuses[mode]} detail="Domyślnie disabled" tone={mode === "disabled" ? "amber" : "green"} />
        <MetricCard label="ENV live" value={overview.liveTradingEnvEnabled ? "true" : "false"} detail="LIVE_TRADING_ENABLED" tone={overview.liveTradingEnvEnabled ? "green" : "amber"} />
        <MetricCard label="Limit wejścia" value={formatMoney(overview.settings.max_entry_amount)} detail={`${overview.settings.max_balance_percent_per_position}% salda`} tone="blue" />
        <MetricCard label="Propozycje" value={overview.approvals.filter((item) => item.status === "pending").length} detail="oczekujące na decyzję" tone="violet" />
      </div>
      {!overview.liveTradingEnvEnabled ? <Notice tone="warning">Backend nie wyśle prawdziwego zlecenia, dopóki LIVE_TRADING_ENABLED nie ma wartości true.</Notice> : null}
      {!overview.exchangeConnection || overview.exchangeConnection.status !== "connected" ? <Notice tone="danger">Live trading wymaga poprawnie przetestowanego połączenia z giełdą.</Notice> : null}
      <div className="trader-status-row">
        <StatusBadge status={mode}>{traderCopy.pl.statuses[mode]}</StatusBadge>
        <span>Obsługiwany jest wyłącznie spot trading, bez dźwigni, margin, futures, wypłat i transferów.</span>
      </div>
    </Panel>
  );
}
