"use client";

import { MetricCard, Notice, Panel } from "@/components/admin/ui";
import PositionCard from "@/components/trader/PositionCard";
import { formatMoney } from "@/components/trader/format";
import type { TraderOverview } from "@/lib/trader/types";

export default function PaperTradingView({
  overview,
  busy,
  onStart,
  onStop,
}: {
  overview: TraderOverview;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const positions = overview.positions;
  const active = positions.filter((position) => position.status === "open");
  const closed = positions.filter((position) => position.status === "closed");
  return (
    <>
      <Panel
        eyebrow="Paper trading"
        title="Symulacja na rzeczywistych cenach"
        footer={
          <div className="trader-panel-actions">
            <button className="button primary" type="button" onClick={onStart} disabled={busy || overview.settings.paper_enabled}>Włącz paper trading</button>
            <button className="button" type="button" onClick={onStop} disabled={busy || !overview.settings.paper_enabled}>Wyłącz paper trading</button>
          </div>
        }
      >
        {!overview.exchangeConnection ? <Notice tone="warning">Paper trading używa publicznych danych rynkowych, ale wejścia zostaną uruchomione dopiero po potwierdzeniu dostępu do rzeczywistych rynków.</Notice> : null}
        <div className="metrics-grid compact-metrics">
          <MetricCard label="Bilans całkowity" value={formatMoney(overview.metrics.totalBalance)} detail={`Start: ${formatMoney(overview.settings.paper_initial_capital)}`} tone="blue" />
          <MetricCard label="Zrealizowany wynik" value={formatMoney(overview.metrics.realizedPnl)} detail={`${overview.metrics.winCount} wygrane / ${overview.metrics.lossCount} przegrane`} tone={overview.metrics.realizedPnl.startsWith("-") ? "amber" : "green"} />
          <MetricCard label="Niezrealizowany wynik" value={formatMoney(overview.metrics.unrealizedPnl)} detail={`${active.length} aktywnych pozycji`} tone="violet" />
          <MetricCard label="Skuteczność" value={`${overview.metrics.winRatePercent}%`} detail={`Max drawdown ${formatMoney(overview.metrics.maxDrawdown)}`} tone="green" />
        </div>
      </Panel>
      <Panel eyebrow="Pozycje" title="Aktywne pozycje">
        <div className="trader-position-grid">
          {active.length ? active.map((position) => <PositionCard key={position.id} position={position} />) : <div className="empty-state">Brak aktywnych pozycji.</div>}
        </div>
      </Panel>
      <Panel eyebrow="Historia paper" title="Zamknięte pozycje">
        <div className="trader-position-grid">
          {closed.length ? closed.slice(0, 12).map((position) => <PositionCard key={position.id} position={position} />) : <div className="empty-state">Brak zamkniętych pozycji.</div>}
        </div>
      </Panel>
    </>
  );
}
