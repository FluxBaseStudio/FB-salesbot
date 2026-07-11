"use client";

import { InputField, Notice, Panel, SelectField, StatusBadge } from "@/components/admin/ui";
import type { TraderExchangeConnectionSummary } from "@/lib/trader/types";

export type ExchangeDraft = {
  exchange_name: string;
  label: string;
  api_key: string;
  api_secret: string;
  api_passphrase: string;
  sandbox: boolean;
};

export default function ExchangeConnectionView({
  connection,
  draft,
  busy,
  onChange,
  onSave,
  onTest,
}: {
  connection: TraderExchangeConnectionSummary | null;
  draft: ExchangeDraft;
  busy: boolean;
  onChange: (patch: Partial<ExchangeDraft>) => void;
  onSave: () => void;
  onTest: () => void;
}) {
  return (
    <Panel
      eyebrow="Połączenie z giełdą"
      title="Klucz API spot"
      footer={
        <div className="trader-panel-actions">
          <button className="button primary" type="button" onClick={onSave} disabled={busy}>Zapisz połączenie</button>
          <button className="button" type="button" onClick={onTest} disabled={busy || !connection}>Testuj połączenie</button>
        </div>
      }
    >
      <Notice tone="warning">Klucz giełdy powinien mieć wyłącznie odczyt konta, odczyt salda oraz składanie i anulowanie zleceń spot. Nie nadawaj uprawnień do wypłat ani transferów.</Notice>
      {connection ? (
        <div className="trader-current-connection">
          <StatusBadge status={connection.status}>{connection.status}</StatusBadge>
          <span>{connection.label} · key ****{connection.api_key_last4 || "----"} · {connection.sandbox ? "sandbox" : "live API"}</span>
        </div>
      ) : <div className="empty-state">Brak zapisanego połączenia z giełdą.</div>}
      <div className="form-grid">
        <SelectField label="Giełda" value={draft.exchange_name} onChange={(value) => onChange({ exchange_name: value })}>
          <option value="binance_spot">Binance Spot</option>
        </SelectField>
        <InputField label="Nazwa połączenia" value={draft.label} onChange={(value) => onChange({ label: value })} />
        <InputField label="API key" value={draft.api_key} onChange={(value) => onChange({ api_key: value })} />
        <InputField label="API secret" value={draft.api_secret} onChange={(value) => onChange({ api_secret: value })} type="password" />
        <InputField label="API passphrase (opcjonalnie)" value={draft.api_passphrase} onChange={(value) => onChange({ api_passphrase: value })} type="password" />
        <label className="field trader-checkbox">
          <span>Tryb sandbox/testnet</span>
          <input type="checkbox" checked={draft.sandbox} onChange={(event) => onChange({ sandbox: event.target.checked })} />
        </label>
      </div>
    </Panel>
  );
}
