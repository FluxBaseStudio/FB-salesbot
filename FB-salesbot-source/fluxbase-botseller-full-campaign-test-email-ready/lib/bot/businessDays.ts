import "server-only";

export function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function zonedDateAtHour(base: Date, hour: number, timeZone: string) {
  const parts = getZonedParts(base, timeZone);
  const guess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, 0, 0, 0));
  return new Date(guess.getTime() - timeZoneOffsetMs(guess, timeZone));
}

export function isWeekendInTimeZone(date: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return weekday === "Sat" || weekday === "Sun";
}

export function nextBusinessDayAtHour(base: Date, hour: number, timeZone: string) {
  let cursor = new Date(base);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = zonedDateAtHour(cursor, hour, timeZone);
    if (!isWeekendInTimeZone(candidate, timeZone)) return candidate;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return zonedDateAtHour(cursor, hour, timeZone);
}

export function ensureBusinessDateAtHour(date: Date, hour: number, timeZone: string) {
  if (!isWeekendInTimeZone(date, timeZone)) return date;
  return nextBusinessDayAtHour(date, hour, timeZone);
}

export function addCalendarDaysSkippingWeekend(days: number, hour: number, timeZone: string) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(days, 1));
  return ensureBusinessDateAtHour(date, hour, timeZone);
}
