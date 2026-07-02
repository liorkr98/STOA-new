/**
 * Trading-day helpers for resolution. US equities use NYSE calendar (weekends +
 * fixed federal holidays). Extend per-exchange as tickers.timezone diversifies.
 */

const US_HOLIDAYS = new Set([
  // 2025
  "2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26",
  "2025-06-19", "2025-07-04", "2025-09-01", "2025-11-27", "2025-12-25",
  // 2026
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  // 2027
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
  "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);

function formatYmd(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function addDays(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(ymd: string): number {
  return parseYmd(ymd).getUTCDay();
}

/** True when the date is a Saturday/Sunday or a known US market holiday. */
export function isNonTradingDay(ymd: string, timeZone = "America/New_York"): boolean {
  // Weekends evaluated in exchange local calendar via UTC-noon trick for US symbols.
  const dow = dayOfWeek(ymd);
  if (dow === 0 || dow === 6) return true;
  if (timeZone === "America/New_York" || timeZone.startsWith("America/")) {
    return US_HOLIDAYS.has(ymd);
  }
  return dow === 0 || dow === 6;
}

/** Next trading session on or after `ymd`. */
export function nextTradingDay(ymd: string, timeZone = "America/New_York"): string {
  let cursor = ymd;
  for (let i = 0; i < 10; i++) {
    if (!isNonTradingDay(cursor, timeZone)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/** Today as YYYY-MM-DD in the given IANA timezone. */
export function todayInTimezone(timeZone: string): string {
  return formatYmd(new Date(), timeZone);
}

/** Horizon end date = today + horizonDays in exchange timezone. */
export function horizonDateFromDays(horizonDays: number, timeZone: string): string {
  let cursor = todayInTimezone(timeZone);
  for (let i = 0; i < horizonDays; i++) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/** End-of-day instant for a trading date (16:00 exchange local → UTC ISO). */
export function marketCloseIso(ymd: string, timeZone = "America/New_York"): string {
  // US equities: 4pm ET. Approximate with fixed offset; sufficient for scheduling resolves_at.
  const offsetHours = timeZone === "America/New_York" ? -5 : 0;
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 16 - offsetHours, 0, 0));
  return utc.toISOString();
}

/** Effective resolution date: rolls weekend/holiday horizons to next trading day. */
export function effectiveResolutionDate(
  targetHorizonDate: string,
  timeZone = "America/New_York",
): { tradingDate: string; substituted: boolean } {
  if (!isNonTradingDay(targetHorizonDate, timeZone)) {
    return { tradingDate: targetHorizonDate, substituted: false };
  }
  return { tradingDate: nextTradingDay(targetHorizonDate, timeZone), substituted: true };
}
