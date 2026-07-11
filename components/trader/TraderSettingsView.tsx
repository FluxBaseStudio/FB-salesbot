"use client";

import { InputField, Notice, Panel, SelectField } from "@/components/admin/ui";
import type { TraderSettings } from "@/lib/trader/types";

export default function TraderSettingsView({
  draft,
  busy,
  onChange,
  onSave,
}: {
  draft: TraderSettings;
  busy: boolean;
  onChange: (patch: Partial<TraderSettings>) => void;
  onSave: () => void;
}) {
  return (
    <Panel
      eyebrow="Ustawienia i ryzyko"
      title="Limity strategii"
      footer={<button className="button primary" type="button" onClick={onSave} disabled={busy}>Zapisz ustawienia</button>}
    >
      <Notice tone="info">Nie ma maksymalnego limitu zysku. Zysk może być zabezpieczany trailing stopem.</Notice>
      <div className="form-grid">
        <InputField label="Wirtualny kapitał początkowy" value={draft.paper_initial_capital} onChange={(value) => onChange({ paper_initial_capital: value })} inputMode="decimal" />
        <InputField label="Paper balance" value={draft.paper_balance} onChange={(value) => onChange({ paper_balance: value })} inputMode="decimal" />
        <InputField label="Maks. kwota wejścia" value={draft.max_entry_amount} onChange={(value) => onChange({ max_entry_amount: value })} inputMode="decimal" />
        <InputField label="Maks. % salda na pozycję" value={draft.max_balance_percent_per_position} onChange={(value) => onChange({ max_balance_percent_per_position: value })} inputMode="decimal" />
        <InputField label="Maks. dzienna strata kwotowo" value={draft.max_daily_loss_amount} onChange={(value) => onChange({ max_daily_loss_amount: value })} inputMode="decimal" />
        <InputField label="Maks. dzienna strata %" value={draft.max_daily_loss_percent} onChange={(value) => onChange({ max_daily_loss_percent: value })} inputMode="decimal" />
        <InputField label="Maks. liczba pozycji" value={String(draft.max_open_positions)} onChange={(value) => onChange({ max_open_positions: Number(value) })} inputMode="numeric" />
        <InputField label="Maks. łączna ekspozycja" value={draft.max_total_exposure} onChange={(value) => onChange({ max_total_exposure: value })} inputMode="decimal" />
        <InputField label="Maks. spread %" value={draft.max_spread_percent} onChange={(value) => onChange({ max_spread_percent: value })} inputMode="decimal" />
        <InputField label="Maks. poślizg %" value={draft.max_slippage_percent} onChange={(value) => onChange({ max_slippage_percent: value })} inputMode="decimal" />
        <InputField label="Min. wolumen 24h" value={draft.min_volume_24h} onChange={(value) => onChange({ min_volume_24h: value })} inputMode="decimal" />
        <InputField label="Min. płynność" value={draft.min_liquidity} onChange={(value) => onChange({ min_liquidity: value })} inputMode="decimal" />
        <InputField label="Stop loss %" value={draft.default_stop_loss_percent} onChange={(value) => onChange({ default_stop_loss_percent: value })} inputMode="decimal" />
        <InputField label="Trailing stop %" value={draft.trailing_stop_percent} onChange={(value) => onChange({ trailing_stop_percent: value })} inputMode="decimal" />
        <InputField label="Symulowana prowizja %" value={draft.simulated_fee_percent} onChange={(value) => onChange({ simulated_fee_percent: value })} inputMode="decimal" />
        <InputField label="Przerwa po serii strat (min)" value={String(draft.loss_streak_cooldown_minutes)} onChange={(value) => onChange({ loss_streak_cooldown_minutes: Number(value) })} inputMode="numeric" />
        <InputField label="Maks. transakcji dziennie" value={String(draft.max_daily_trades)} onChange={(value) => onChange({ max_daily_trades: Number(value) })} inputMode="numeric" />
        <SelectField label="Polityka resetu limitu straty" value={draft.daily_loss_policy} onChange={(value) => onChange({ daily_loss_policy: value === "manual" ? "manual" : "next_day" })}>
          <option value="next_day">Następnego dnia</option>
          <option value="manual">Manualna</option>
        </SelectField>
      </div>
    </Panel>
  );
}
