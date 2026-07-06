"use client";

import { dateRangeLabel, getPresetDateRange, type DateRangePreset, type DateRangeValue } from "@/lib/dateRange";

const presets: Array<{ value: DateRangePreset; label: string }> = [
  { value: "today", label: "Dzisiaj" },
  { value: "yesterday", label: "Wczoraj" },
  { value: "last7", label: "Ostatnie 7 dni" },
  { value: "last14", label: "Ostatnie 14 dni" },
  { value: "last30", label: "Ostatnie 30 dni" },
  { value: "thisMonth", label: "Ten miesiąc" },
  { value: "previousMonth", label: "Poprzedni miesiąc" },
  { value: "custom", label: "Własny zakres" },
];

export default function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  function changePreset(preset: DateRangePreset) {
    if (preset === "custom") onChange({ ...value, preset: "custom" });
    else onChange(getPresetDateRange(preset));
  }

  return (
    <div className="date-range-filter" aria-label="Zakres statystyk">
      <span aria-hidden="true" className="date-range-icon">
        <svg viewBox="0 0 24 24">
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      </span>
      <div className="date-range-label">
        <strong>{dateRangeLabel(value)}</strong>
      </div>
      <select value={value.preset} onChange={(event) => changePreset(event.target.value as DateRangePreset)}>
        {presets.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>
      {value.preset === "custom" ? (
        <div className="date-range-custom">
          <input type="date" value={value.dateFrom} onChange={(event) => onChange({ ...value, dateFrom: event.target.value })} />
          <input type="date" value={value.dateTo} onChange={(event) => onChange({ ...value, dateTo: event.target.value })} />
        </div>
      ) : null}
    </div>
  );
}
