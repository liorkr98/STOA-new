/**
 * Cart weeks. A tap is stored with a UTC timestamp and only bucketed into a
 * week when it is read, in the reader's own local time, so a reader who
 * travels keeps one cart and a change of week rule never rewrites a row.
 */

/**
 * The day a cart week starts on, as `Date.getDay()` numbers it (0 is Sunday,
 * 1 is Monday). Monday for now. Stoa launches Israel-first and the TASE week
 * runs Sunday to Thursday, so this is expected to become 0. Changing it here
 * moves every week boundary, the "resets Monday" line and the week switcher.
 */
export const WEEK_STARTS_ON = 1;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The name of the day the cart resets on ("Monday"). */
export const RESET_DAY = DAY_NAMES[WEEK_STARTS_ON];

/** Local midnight at the start of the week containing `at`. */
export function weekStartOf(at: Date, startsOn: number = WEEK_STARTS_ON): Date {
  const start = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  const back = (start.getDay() - startsOn + 7) % 7;
  start.setDate(start.getDate() - back);
  return start;
}

/**
 * A week moved by `n` weeks. Calendar days, not 7 x 24 hours, so a week that
 * crosses a clock change still starts at local midnight.
 */
export function addWeeks(weekStart: Date, n: number): Date {
  return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + n * 7);
}

/** A week's key: its first local day as YYYY-MM-DD. */
export function weekKey(weekStart: Date): string {
  const y = weekStart.getFullYear();
  const m = String(weekStart.getMonth() + 1).padStart(2, "0");
  const d = String(weekStart.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The local midnight a week key names, or null when it is not a date. */
export function parseWeekKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const at = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(at.getTime()) ? null : at;
}

/** The key of the week containing `at`. */
export function weekKeyOf(at: Date, startsOn: number = WEEK_STARTS_ON): string {
  return weekKey(weekStartOf(at, startsOn));
}

/** The UTC instants a local week runs between: [from, to). */
export function weekBounds(weekStart: Date): { fromIso: string; toIso: string } {
  return { fromIso: weekStart.toISOString(), toIso: addWeeks(weekStart, 1).toISOString() };
}

/** "12-18 Oct", or "29 Sep-5 Oct" when the week crosses a month. */
export function weekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const a = weekStart.getDate();
  const b = end.getDate();
  if (weekStart.getMonth() === end.getMonth()) return `${a}-${b} ${MONTHS[end.getMonth()]}`;
  return `${a} ${MONTHS[weekStart.getMonth()]}-${b} ${MONTHS[end.getMonth()]}`;
}
