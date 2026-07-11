export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last14"
  | "last30"
  | "all"
  | "thisMonth"
  | "previousMonth"
  | "custom";

export type DateRangeValue = {
  preset: DateRangePreset;
  dateFrom: string;
  dateTo: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getPresetDateRange(preset: DateRangePreset, base = new Date()): DateRangeValue {
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (preset === "today") return { preset, dateFrom: dateKey(today), dateTo: dateKey(today) };
  if (preset === "yesterday") {
    const yesterday = addDays(today, -1);
    return { preset, dateFrom: dateKey(yesterday), dateTo: dateKey(yesterday) };
  }
  if (preset === "last14") return { preset, dateFrom: dateKey(addDays(today, -13)), dateTo: dateKey(today) };
  if (preset === "last30") return { preset, dateFrom: dateKey(addDays(today, -29)), dateTo: dateKey(today) };
  if (preset === "all") return { preset, dateFrom: "2020-01-01", dateTo: dateKey(today) };
  if (preset === "thisMonth") return { preset, dateFrom: dateKey(startOfMonth(today)), dateTo: dateKey(today) };
  if (preset === "previousMonth") {
    const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { preset, dateFrom: dateKey(startOfMonth(previous)), dateTo: dateKey(endOfMonth(previous)) };
  }
  return { preset: "last7", dateFrom: dateKey(addDays(today, -6)), dateTo: dateKey(today) };
}

export function defaultDateRange() {
  return getPresetDateRange("last7");
}

export function dateRangeLabel(range: Pick<DateRangeValue, "dateFrom" | "dateTo">) {
  const formatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" });
  const start = new Date(`${range.dateFrom}T12:00:00`);
  const end = new Date(`${range.dateTo}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Ostatnie 7 dni";
  const sameYear = start.getFullYear() === end.getFullYear();
  const shortFormatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" });
  return `${sameYear ? shortFormatter.format(start) : formatter.format(start)} - ${formatter.format(end)}`.replace(/\./g, "");
}
