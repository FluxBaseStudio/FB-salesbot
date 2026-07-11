import { MetricCard, Notice, Panel, StatusBadge } from "@/components/admin/ui";
import { formatMoney } from "@/components/trader/format";
import type { TraderOverview } from "@/lib/trader/types";

export default function RiskStatus({ overview }: { overview: TraderOverview }) {
  const settings = overview.settings;
  const dailyLocked = overview.dailyRisk?.daily_loss_limit_hit || false;
  return (
    <Panel eyebrow="Ryzyko" title="Status bezpieczeństwa">
      <div className="trader-risk-grid">
        <MetricCard label="Tryb live" value={settings.trading_mode} detail={overview.liveTradingEnvEnabled ? "ENV pozwala na live" : "LIVE_TRADING_ENABLED=false"} tone={settings.trading_mode === "disabled" ? "amber" : "green"} />
        <MetricCard label="Paper balance" value={formatMoney(settings.paper_balance)} detail={settings.paper_enabled ? "paper włączony" : "paper wyłączony"} tone="blue" />
        <MetricCard label="Dzisiejszy P/L" value={formatMoney(overview.dailyRisk?.realized_pnl || "0")} detail={`${overview.dailyRisk?.trades_count || 0} transakcji dziś`} tone={(overview.dailyRisk?.realized_pnl || "0").startsWith("-") ? "amber" : "green"} />
        <MetricCard label="Otwarte pozycje" value={`${overview.metrics.openPositions}/${settings.max_open_positions}`} detail={`ekspozycja max ${formatMoney(settings.max_total_exposure)}`} tone="violet" />
      </div>
      {settings.emergency_stop_active ? <Notice tone="danger">Awaryjne zatrzymanie jest aktywne. Nowe wejścia i wykonanie zleceń są zablokowane.</Notice> : null}
      {dailyLocked ? <Notice tone="danger">Osiągnięto maksymalną dzienną stratę. Nowe wejścia są zablokowane do kolejnego resetu polityki ryzyka.</Notice> : null}
      <div className="trader-status-row">
        <StatusBadge status={overview.exchangeConnection?.status || "failed"}>{overview.exchangeConnection ? overview.exchangeConnection.status : "brak połączenia"}</StatusBadge>
        <span>Klucze giełdy nigdy nie są zwracane do przeglądarki po zapisaniu.</span>
      </div>
    </Panel>
  );
}
