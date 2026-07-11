"use client";

import { useMemo, useState } from "react";

import { DataTable, InputField, MetricCard, Notice, Panel, SelectField, StatusBadge, TextAreaField } from "@/components/admin/ui";
import { formatDateTime } from "@/components/trader/format";
import type { TraderAiBot, TraderAiBotsOverview, TraderAiBotRole } from "@/lib/trader/types";

export type TraderAiBotDraft = {
  id?: string;
  name: string;
  role: TraderAiBotRole;
  status: "active" | "paused";
  model: string;
  instructions: string;
  min_confidence_score: string;
  analyze_market: boolean;
  analyze_fomo: boolean;
  can_veto: boolean;
  api_key: string;
  api_key_action: "preserve" | "replace" | "clear";
};

const roleLabels: Record<TraderAiBotRole, string> = {
  market_analyst: "Analityk rynku",
  fomo_verifier: "Weryfikator FOMO",
  risk_guard: "Strażnik ryzyka",
  decision_reviewer: "Recenzent decyzji",
};

const emptyDraft: TraderAiBotDraft = {
  name: "",
  role: "market_analyst",
  status: "active",
  model: "gpt-5.6-luna",
  instructions: "",
  min_confidence_score: "70",
  analyze_market: true,
  analyze_fomo: true,
  can_veto: false,
  api_key: "",
  api_key_action: "preserve",
};

function draftFromBot(bot: TraderAiBot): TraderAiBotDraft {
  return {
    id: bot.id,
    name: bot.name,
    role: bot.role,
    status: bot.status,
    model: bot.model,
    instructions: bot.instructions,
    min_confidence_score: String(bot.min_confidence_score),
    analyze_market: bot.analyze_market,
    analyze_fomo: bot.analyze_fomo,
    can_veto: bot.can_veto,
    api_key: "",
    api_key_action: "preserve",
  };
}

export default function TraderAiBotsView({
  overview,
  busy,
  onSave,
  onToggle,
  onTest,
  onDelete,
  onRefresh,
}: {
  overview: TraderAiBotsOverview;
  busy: boolean;
  onSave: (draft: TraderAiBotDraft) => void;
  onToggle: (id: string, active: boolean) => void;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState<TraderAiBotDraft>(emptyDraft);
  const editingBot = useMemo(() => draft.id ? overview.bots.find((bot) => bot.id === draft.id) || null : null, [draft.id, overview.bots]);

  function reset() {
    setDraft(emptyDraft);
  }

  function submit() {
    onSave(draft);
    setDraft(emptyDraft);
  }

  return (
    <div className="trader-stack">
      <Notice tone="info">
        Boty OpenAI są dodatkową warstwą analizy. Nie omijają twardych limitów ryzyka. Sygnał FOMO lub własnego skanera może przejść dalej tylko po zgodności z filtrami kodu, a automatyczne zlecenia są ograniczone do sandbox/testnet.
      </Notice>
      {!overview.globalApiKeyAvailable ? (
        <Notice tone="warning">Brakuje globalnego klucza OpenAI. Dodaj własny klucz do bota albo ustaw OPENAI_API_KEY / aktywny sekret OpenAI.</Notice>
      ) : null}

      <div className="metrics-grid compact-metrics">
        <MetricCard label="Aktywne boty" value={overview.metrics.activeBots} detail="rada analityczna" tone="violet" />
        <MetricCard label="Analiza rynku" value={overview.metrics.marketBots} detail="boty aktywne" tone="blue" />
        <MetricCard label="Analiza FOMO" value={overview.metrics.fomoBots} detail="boty aktywne" tone="amber" />
        <MetricCard label="Udane analizy" value={overview.metrics.successfulRuns} detail="ostatnie 100 uruchomień" tone="green" />
      </div>

      <Panel
        eyebrow={editingBot ? "Edycja konfiguracji" : "Nowy członek rady"}
        title={editingBot ? `Edytuj: ${editingBot.name}` : "Dodaj bota OpenAI"}
        footer={
          <div className="trader-panel-actions">
            <button className="button primary" type="button" disabled={busy || draft.name.trim().length < 2} onClick={submit}>
              {editingBot ? "Zapisz zmiany" : "Dodaj bota"}
            </button>
            {editingBot ? <button className="button" type="button" disabled={busy} onClick={reset}>Anuluj edycję</button> : null}
            <button className="button" type="button" disabled={busy} onClick={onRefresh}>Odśwież</button>
          </div>
        }
      >
        <div className="form-grid">
          <InputField label="Nazwa bota" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} placeholder="np. FOMO Guard" />
          <SelectField label="Rola" value={draft.role} onChange={(value) => setDraft((current) => ({ ...current, role: value as TraderAiBotRole }))}>
            {Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </SelectField>
          <InputField label="Model OpenAI" value={draft.model} onChange={(value) => setDraft((current) => ({ ...current, model: value }))} placeholder="np. gpt-5.6-luna" />
          <InputField label="Minimalna pewność 0-100" value={draft.min_confidence_score} onChange={(value) => setDraft((current) => ({ ...current, min_confidence_score: value }))} inputMode="numeric" />
          <TextAreaField label="Instrukcje systemowe bota" value={draft.instructions} onChange={(value) => setDraft((current) => ({ ...current, instructions: value }))} placeholder="Opisz, na czym bot ma się skupiać i kiedy ma odrzucać sygnał." span />
          <InputField
            label={editingBot?.has_api_key ? `Nowy API key, obecny kończy się na ${editingBot.api_key_last4 || "----"}` : "Własny OpenAI API key, opcjonalnie"}
            value={draft.api_key}
            onChange={(value) => setDraft((current) => ({ ...current, api_key: value, api_key_action: value ? "replace" : current.api_key_action }))}
            type="password"
            placeholder="Pusty = globalny OPENAI_API_KEY"
            span
          />
          <label className="field trader-checkbox">
            <span>Analizuj własny skaner rynku</span>
            <input type="checkbox" checked={draft.analyze_market} onChange={(event) => setDraft((current) => ({ ...current, analyze_market: event.target.checked }))} />
          </label>
          <label className="field trader-checkbox">
            <span>Analizuj sygnały FOMO</span>
            <input type="checkbox" checked={draft.analyze_fomo} onChange={(event) => setDraft((current) => ({ ...current, analyze_fomo: event.target.checked }))} />
          </label>
          <label className="field trader-checkbox">
            <span>Bot może zawetować decyzję</span>
            <input type="checkbox" checked={draft.can_veto} onChange={(event) => setDraft((current) => ({ ...current, can_veto: event.target.checked }))} />
          </label>
          {editingBot?.has_api_key ? (
            <label className="field trader-checkbox">
              <span>Usuń przypisany API key i używaj globalnego</span>
              <input type="checkbox" checked={draft.api_key_action === "clear"} onChange={(event) => setDraft((current) => ({ ...current, api_key: "", api_key_action: event.target.checked ? "clear" : "preserve" }))} />
            </label>
          ) : null}
        </div>
      </Panel>

      <Panel title="Boty analityczne" eyebrow="OpenAI Responses API">
        <DataTable
          rows={overview.bots}
          empty="Nie dodano jeszcze żadnego bota OpenAI."
          columns={["Bot", "Rola", "Zakres", "API", "Test", "Status", "Akcje"]}
          render={(bot) => (
            <tr key={bot.id}>
              <td><strong>{bot.name}</strong><span>{bot.model}</span></td>
              <td>{roleLabels[bot.role]}<span>próg {bot.min_confidence_score}/100{bot.can_veto ? " · weto" : ""}</span></td>
              <td>{[bot.analyze_market ? "rynek" : null, bot.analyze_fomo ? "FOMO" : null].filter(Boolean).join(" + ") || "brak"}</td>
              <td>{bot.has_api_key ? `własny ****${bot.api_key_last4 || "----"}` : "globalny"}</td>
              <td><StatusBadge status={bot.last_test_status === "connected" ? "active" : bot.last_test_status === "failed" ? "failed" : "pending"}>{bot.last_test_status}</StatusBadge><span>{bot.last_tested_at ? formatDateTime(bot.last_tested_at) : "nie testowano"}</span>{bot.last_error ? <span>{bot.last_error}</span> : null}</td>
              <td><StatusBadge status={bot.status === "active" ? "active" : "paused"}>{bot.status === "active" ? "Aktywny" : "Wstrzymany"}</StatusBadge></td>
              <td>
                <div className="trader-table-actions">
                  <button className="button small" type="button" disabled={busy} onClick={() => setDraft(draftFromBot(bot))}>Edytuj</button>
                  <button className="button small" type="button" disabled={busy} onClick={() => onTest(bot.id)}>Test</button>
                  <button className="button small" type="button" disabled={busy} onClick={() => onToggle(bot.id, bot.status !== "active")}>{bot.status === "active" ? "Pauza" : "Włącz"}</button>
                  <button className="button small danger-soft" type="button" disabled={busy} onClick={() => onDelete(bot.id)}>Usuń</button>
                </div>
              </td>
            </tr>
          )}
        />
      </Panel>

      <Panel title="Ostatnie analizy" eyebrow="Dziennik decyzji">
        <DataTable
          rows={overview.runs}
          empty="Boty nie wykonały jeszcze żadnej analizy."
          columns={["Bot", "Kontekst", "Symbol", "Decyzja", "Pewność", "Ryzyko", "Uzasadnienie", "Czas"]}
          render={(run) => (
            <tr key={run.id}>
              <td>{run.bot_name || "Usunięty bot"}<span>{run.model || "-"}</span></td>
              <td>{run.context_type === "fomo_signal" ? "FOMO" : run.context_type === "market_signal" ? "Rynek" : "Test"}</td>
              <td>{run.symbol || "-"}</td>
              <td><StatusBadge status={run.status === "failed" ? "failed" : run.decision === "buy" ? "active" : run.decision === "reject" ? "failed" : "pending"}>{run.status === "failed" ? "Błąd" : run.decision || "-"}</StatusBadge></td>
              <td>{run.confidence_score ?? "-"}/100</td>
              <td>{run.risk_level || "-"}</td>
              <td>{run.rationale || run.error_message || "-"}{run.warnings.length ? <span>{run.warnings.join(" · ")}</span> : null}</td>
              <td>{formatDateTime(run.created_at)}</td>
            </tr>
          )}
        />
      </Panel>
    </div>
  );
}
