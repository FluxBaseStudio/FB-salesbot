"use client";

import { useEffect, useMemo, useState } from "react";

import {
  DataTable,
  InputField,
  MetricCard,
  Notice,
  Panel,
  SelectField,
  StatusBadge,
} from "@/components/admin/ui";
import {
  formatDateTime,
  formatDecimal,
  formatMoney,
} from "@/components/trader/format";
import type { TraderCopyOverview } from "@/lib/trader/types";

type SourceDraft = {
  display_name: string;
  profile_reference: string;
  wallet_address: string;
  chain: string;
  source_score: string;
  win_rate_percent: string;
  max_drawdown_percent: string;
  observed_trades: string;
};

type SignalDraft = {
  source_id: string;
  symbol: string;
  side: "buy" | "sell";
  source_price: string;
  confidence_score: string;
  external_signal_id: string;
  rationale: string;
};

const initialSource: SourceDraft = {
  display_name: "",
  profile_reference: "",
  wallet_address: "",
  chain: "solana",
  source_score: "70",
  win_rate_percent: "0",
  max_drawdown_percent: "0",
  observed_trades: "0",
};

const initialSignal: SignalDraft = {
  source_id: "",
  symbol: "",
  side: "buy",
  source_price: "",
  confidence_score: "70",
  external_signal_id: "",
  rationale: "",
};

function signalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Oczekuje",
    qualified: "Zakwalifikowany",
    promoted: "Przekazany do live/testnet",
    copied: "Skopiowany paper",
    skipped: "Pominięty",
    expired: "Wygasł",
  };
  return labels[status] || status;
}

export default function FomoCopyTradingView({
  overview,
  busy,
  onRefresh,
  onSaveSettings,
  onAddSource,
  onToggleSource,
  onImportSignal,
  onRun,
}: {
  overview: TraderCopyOverview;
  busy: boolean;
  onRefresh: () => void;
  onSaveSettings: (patch: Record<string, unknown>) => void;
  onAddSource: (payload: Record<string, unknown>) => void;
  onToggleSource: (id: string, isActive: boolean) => void;
  onImportSignal: (payload: Record<string, unknown>) => void;
  onRun: () => void;
}) {
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(initialSource);
  const [signalDraft, setSignalDraft] = useState<SignalDraft>(initialSignal);
  const [copyAmount, setCopyAmount] = useState(
    overview.settings.copy_position_amount,
  );
  const [minSourceScore, setMinSourceScore] = useState(
    String(overview.settings.copy_min_source_score),
  );
  const [minConfidence, setMinConfidence] = useState(
    String(overview.settings.copy_min_confidence_score),
  );
  const [maxAge, setMaxAge] = useState(
    String(overview.settings.copy_max_signal_age_seconds),
  );
  const [maxDrift, setMaxDrift] = useState(
    overview.settings.copy_max_price_drift_percent,
  );
  const [requireAi, setRequireAi] = useState(
    overview.settings.copy_require_ai_review,
  );
  const [minAiConfidence, setMinAiConfidence] = useState(
    String(overview.settings.copy_min_ai_confidence_score),
  );
  const [promoteToLive, setPromoteToLive] = useState(
    overview.settings.copy_promote_to_live_proposals,
  );

  const activeSources = useMemo(
    () => overview.sources.filter((source) => source.is_active),
    [overview.sources],
  );

  useEffect(() => {
    setCopyAmount(overview.settings.copy_position_amount);
    setMinSourceScore(String(overview.settings.copy_min_source_score));
    setMinConfidence(String(overview.settings.copy_min_confidence_score));
    setMaxAge(String(overview.settings.copy_max_signal_age_seconds));
    setMaxDrift(overview.settings.copy_max_price_drift_percent);
    setRequireAi(overview.settings.copy_require_ai_review);
    setMinAiConfidence(String(overview.settings.copy_min_ai_confidence_score));
    setPromoteToLive(overview.settings.copy_promote_to_live_proposals);
  }, [overview.settings]);

  function submitSource() {
    onAddSource({
      ...sourceDraft,
      source_score: Number(sourceDraft.source_score),
      win_rate_percent: sourceDraft.win_rate_percent,
      max_drawdown_percent: sourceDraft.max_drawdown_percent,
      observed_trades: Number(sourceDraft.observed_trades),
    });
    setSourceDraft(initialSource);
  }

  function submitSignal() {
    onImportSignal({
      ...signalDraft,
      confidence_score: Number(signalDraft.confidence_score),
      detected_at: new Date().toISOString(),
    });
    setSignalDraft(initialSignal);
  }

  return (
    <div className="stack-lg">
      <Notice tone="info">
        FOMO jest źródłem sygnałów dla wspólnego silnika decyzji. Gdy topowy
        trader kupi memcoina, sygnał przechodzi szybkie filtry, radę botów
        OpenAI i może trafić jednocześnie do paper tradingu oraz kolejki
        live/testnet.
      </Notice>
      {!overview.settings.paper_enabled ? (
        <Notice tone="warning">
          Paper trading jest wyłączony. Sygnały FOMO nadal mogą być analizowane
          i przekazywane do propozycji live/testnet, ale nie otworzą pozycji
          symulacyjnej.
        </Notice>
      ) : null}
      {overview.settings.emergency_stop_active ? (
        <Notice tone="danger">
          Awaryjne zatrzymanie blokuje również FOMO Copy.
        </Notice>
      ) : null}

      <div className="metrics-grid compact-metrics">
        <MetricCard
          label="Aktywne źródła"
          value={overview.metrics.activeSources}
          detail="traderzy i portfele"
          tone="violet"
        />
        <MetricCard
          label="Kolejka sygnałów"
          value={overview.metrics.pendingSignals}
          detail="do analizy"
          tone="amber"
        />
        <MetricCard
          label="Skopiowane"
          value={overview.metrics.copiedSignals}
          detail="paper po analizie"
          tone="green"
        />
        <MetricCard
          label="Otwarte pozycje"
          value={overview.metrics.copyPositionsOpen}
          detail="pochodzenie FOMO"
        />
      </div>

      <Panel title="Sterowanie FOMO" eyebrow="Signal hub">
        <div className="trader-panel-actions fomo-control-row">
          <div className="trader-status-row">
            <span>Status</span>
            <StatusBadge
              status={overview.settings.copy_enabled ? "active" : "paused"}
            >
              {overview.settings.copy_enabled ? "Aktywny" : "Wyłączony"}
            </StatusBadge>
          </div>
          <button
            className={
              overview.settings.copy_enabled
                ? "button warning"
                : "button primary"
            }
            type="button"
            disabled={busy || overview.settings.emergency_stop_active}
            onClick={() =>
              onSaveSettings({ copy_enabled: !overview.settings.copy_enabled })
            }
          >
            {overview.settings.copy_enabled
              ? "Wyłącz analizę FOMO"
              : "Włącz analizę FOMO"}
          </button>
          <button
            className="button primary-soft"
            type="button"
            disabled={busy || !overview.settings.copy_enabled}
            onClick={onRun}
          >
            Analizuj kolejkę teraz
          </button>
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={onRefresh}
          >
            Odśwież
          </button>
        </div>
      </Panel>

      <Panel title="Filtry kopiowania" eyebrow="Risk gate">
        <div className="form-grid">
          <InputField
            label="Kwota jednej pozycji (USDT)"
            value={copyAmount}
            onChange={setCopyAmount}
            inputMode="decimal"
          />
          <InputField
            label="Minimalna ocena źródła 0-100"
            value={minSourceScore}
            onChange={setMinSourceScore}
            inputMode="numeric"
          />
          <InputField
            label="Minimalna pewność sygnału 0-100"
            value={minConfidence}
            onChange={setMinConfidence}
            inputMode="numeric"
          />
          <InputField
            label="Maksymalny wiek sygnału (sek.)"
            value={maxAge}
            onChange={setMaxAge}
            inputMode="numeric"
          />
          <InputField
            label="Maksymalna ucieczka ceny (%)"
            value={maxDrift}
            onChange={setMaxDrift}
            inputMode="decimal"
          />
          <InputField
            label="Minimalna pewność rady OpenAI 0-100"
            value={minAiConfidence}
            onChange={setMinAiConfidence}
            inputMode="numeric"
          />
          <label className="field trader-checkbox">
            <span>Wymagaj zatwierdzenia przez boty OpenAI</span>
            <input
              type="checkbox"
              checked={requireAi}
              onChange={(event) => setRequireAi(event.target.checked)}
            />
          </label>
          <label className="field trader-checkbox">
            <span>Przekazuj zatwierdzone kupna do live/testnet</span>
            <input
              type="checkbox"
              checked={promoteToLive}
              onChange={(event) => setPromoteToLive(event.target.checked)}
            />
          </label>
        </div>
        <div className="panel-footer trader-panel-actions">
          <button
            className="button primary"
            type="button"
            disabled={busy}
            onClick={() =>
              onSaveSettings({
                copy_position_amount: copyAmount,
                copy_min_source_score: Number(minSourceScore),
                copy_min_confidence_score: Number(minConfidence),
                copy_max_signal_age_seconds: Number(maxAge),
                copy_max_price_drift_percent: maxDrift,
                copy_require_ai_review: requireAi,
                copy_min_ai_confidence_score: Number(minAiConfidence),
                copy_promote_to_live_proposals: promoteToLive,
              })
            }
          >
            Zapisz filtry
          </button>
        </div>
      </Panel>

      <div className="fomo-two-column">
        <Panel title="Dodaj źródło FOMO" eyebrow="Trader lub publiczny portfel">
          <div className="form-grid">
            <InputField
              label="Nazwa źródła"
              value={sourceDraft.display_name}
              onChange={(value) =>
                setSourceDraft((current) => ({
                  ...current,
                  display_name: value,
                }))
              }
              placeholder="np. Trader Alpha"
              span
            />
            <InputField
              label="Profil / identyfikator"
              value={sourceDraft.profile_reference}
              onChange={(value) =>
                setSourceDraft((current) => ({
                  ...current,
                  profile_reference: value,
                }))
              }
              placeholder="Opcjonalny identyfikator profilu"
              span
            />
            <InputField
              label="Publiczny adres portfela"
              value={sourceDraft.wallet_address}
              onChange={(value) =>
                setSourceDraft((current) => ({
                  ...current,
                  wallet_address: value,
                }))
              }
              placeholder="Opcjonalnie, bez klucza prywatnego"
              span
            />
            <SelectField
              label="Sieć"
              value={sourceDraft.chain}
              onChange={(value) =>
                setSourceDraft((current) => ({ ...current, chain: value }))
              }
            >
              <option value="solana">Solana</option>
              <option value="base">Base</option>
              <option value="bnb">BNB Chain</option>
              <option value="monad">Monad</option>
              <option value="hyperliquid">Hyperliquid</option>
              <option value="other">Inna</option>
            </SelectField>
            <InputField
              label="Ocena źródła"
              value={sourceDraft.source_score}
              onChange={(value) =>
                setSourceDraft((current) => ({
                  ...current,
                  source_score: value,
                }))
              }
              inputMode="numeric"
            />
            <InputField
              label="Win rate (%)"
              value={sourceDraft.win_rate_percent}
              onChange={(value) =>
                setSourceDraft((current) => ({
                  ...current,
                  win_rate_percent: value,
                }))
              }
              inputMode="decimal"
            />
            <InputField
              label="Max drawdown (%)"
              value={sourceDraft.max_drawdown_percent}
              onChange={(value) =>
                setSourceDraft((current) => ({
                  ...current,
                  max_drawdown_percent: value,
                }))
              }
              inputMode="decimal"
            />
            <InputField
              label="Liczba obserwowanych transakcji"
              value={sourceDraft.observed_trades}
              onChange={(value) =>
                setSourceDraft((current) => ({
                  ...current,
                  observed_trades: value,
                }))
              }
              inputMode="numeric"
            />
          </div>
          <div className="panel-footer">
            <button
              className="button primary"
              type="button"
              disabled={busy || sourceDraft.display_name.trim().length < 2}
              onClick={submitSource}
            >
              Dodaj źródło
            </button>
          </div>
        </Panel>

        <Panel title="Importuj sygnał" eyebrow="Ręcznie lub przez webhook">
          <div className="form-grid">
            <SelectField
              label="Źródło"
              value={signalDraft.source_id}
              onChange={(value) =>
                setSignalDraft((current) => ({ ...current, source_id: value }))
              }
              span
            >
              <option value="">Bez przypisanego źródła</option>
              {activeSources.map((source) => (
                <option value={source.id} key={source.id}>
                  {source.display_name}
                </option>
              ))}
            </SelectField>
            <InputField
              label="Symbol rynku"
              value={signalDraft.symbol}
              onChange={(value) =>
                setSignalDraft((current) => ({
                  ...current,
                  symbol: value.toUpperCase(),
                }))
              }
              placeholder="np. PEPEUSDT"
            />
            <SelectField
              label="Kierunek"
              value={signalDraft.side}
              onChange={(value) =>
                setSignalDraft((current) => ({
                  ...current,
                  side: value === "sell" ? "sell" : "buy",
                }))
              }
            >
              <option value="buy">Kupno</option>
              <option value="sell">Sprzedaż / zamknięcie</option>
            </SelectField>
            <InputField
              label="Cena u źródła"
              value={signalDraft.source_price}
              onChange={(value) =>
                setSignalDraft((current) => ({
                  ...current,
                  source_price: value,
                }))
              }
              inputMode="decimal"
            />
            <InputField
              label="Pewność sygnału"
              value={signalDraft.confidence_score}
              onChange={(value) =>
                setSignalDraft((current) => ({
                  ...current,
                  confidence_score: value,
                }))
              }
              inputMode="numeric"
            />
            <InputField
              label="Zewnętrzne ID"
              value={signalDraft.external_signal_id}
              onChange={(value) =>
                setSignalDraft((current) => ({
                  ...current,
                  external_signal_id: value,
                }))
              }
              placeholder="Chroni przed duplikatem"
            />
            <InputField
              label="Notatka"
              value={signalDraft.rationale}
              onChange={(value) =>
                setSignalDraft((current) => ({ ...current, rationale: value }))
              }
              placeholder="Dlaczego sygnał jest wart obserwacji"
              span
            />
          </div>
          <div className="panel-footer">
            <button
              className="button primary"
              type="button"
              disabled={
                busy || !signalDraft.symbol || !signalDraft.source_price
              }
              onClick={submitSignal}
            >
              Dodaj do kolejki
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="Obserwowane źródła" eyebrow="FOMO watchlist">
        <DataTable
          rows={overview.sources}
          empty="Nie dodano jeszcze żadnego źródła FOMO."
          columns={["Źródło", "Sieć", "Ocena", "Wyniki", "Status", "Akcja"]}
          render={(source) => (
            <tr key={source.id}>
              <td>
                <strong>{source.display_name}</strong>
                <span>
                  {source.profile_reference ||
                    source.wallet_address ||
                    "Ręcznie dodane źródło"}
                </span>
              </td>
              <td>{source.chain}</td>
              <td>{source.source_score}/100</td>
              <td>
                {formatDecimal(source.win_rate_percent)}% WR
                <span>
                  {source.observed_trades} obserwacji, DD{" "}
                  {formatDecimal(source.max_drawdown_percent)}%
                </span>
              </td>
              <td>
                <StatusBadge status={source.is_active ? "active" : "paused"}>
                  {source.is_active ? "Aktywne" : "Wyłączone"}
                </StatusBadge>
              </td>
              <td>
                <button
                  className="button small"
                  type="button"
                  disabled={busy}
                  onClick={() => onToggleSource(source.id, !source.is_active)}
                >
                  {source.is_active ? "Wyłącz" : "Włącz"}
                </button>
              </td>
            </tr>
          )}
        />
      </Panel>

      <Panel title="Sygnały FOMO" eyebrow="Kolejka analizy">
        <DataTable
          rows={overview.signals}
          empty="Brak sygnałów. Dodaj sygnał ręcznie albo skonfiguruj webhook."
          columns={[
            "Źródło",
            "Rynek",
            "Kierunek",
            "Cena",
            "Ocena",
            "Status",
            "Czas",
          ]}
          render={(signal) => (
            <tr key={signal.id}>
              <td>
                {signal.source_name || "FOMO import"}
                <span>{signal.chain}</span>
              </td>
              <td>
                <strong>{signal.pair}</strong>
                <span>{signal.symbol}</span>
              </td>
              <td>{signal.side === "buy" ? "Kupno" : "Sprzedaż"}</td>
              <td>
                {formatMoney(signal.source_price)}
                <span>
                  dryf: {formatDecimal(signal.price_drift_percent, 3)}%
                </span>
              </td>
              <td>
                {signal.source_score}/100
                <span>pewność {signal.confidence_score}/100</span>
              </td>
              <td>
                <StatusBadge
                  status={
                    signal.status === "copied" || signal.status === "promoted"
                      ? "completed"
                      : signal.status === "skipped" ||
                          signal.status === "expired"
                        ? "failed"
                        : "running"
                  }
                >
                  {signalStatusLabel(signal.status)}
                </StatusBadge>
                <span>{signal.rationale}</span>
                {signal.ai_decision ? (
                  <span>
                    OpenAI: {signal.ai_decision} ·{" "}
                    {signal.ai_confidence_score ?? 0}/100 ·{" "}
                    {signal.ai_risk_level || "-"}
                  </span>
                ) : null}
                {signal.ai_rationale ? (
                  <span>{signal.ai_rationale}</span>
                ) : null}
              </td>
              <td>
                {formatDateTime(signal.detected_at)}
                <span>wygasa {formatDateTime(signal.expires_at)}</span>
              </td>
            </tr>
          )}
        />
      </Panel>
    </div>
  );
}
