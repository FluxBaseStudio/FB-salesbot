export function formatDecimal(value?: string | null, digits = 2, locale = "pl-PL") {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return value || "0";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(parsed);
}

export function formatMoney(value?: string | null, currency = "USDT", locale = "pl-PL") {
  return `${formatDecimal(value, 4, locale)} ${currency}`;
}

export function formatDateTime(value?: string | null, locale = "pl-PL") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(date);
}
