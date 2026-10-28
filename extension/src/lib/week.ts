/**
 * The cart's week, as the site counts it (src/lib/interest-cart/week.ts):
 * from Monday 00:00 in the reader's own time zone.
 */
export const WEEK_STARTS_ON = 1;

export function weekStartOf(at: Date, startsOn = WEEK_STARTS_ON): Date {
  const d = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  const back = (d.getDay() - startsOn + 7) % 7;
  d.setDate(d.getDate() - back);
  return d;
}

export function inWeekOf(iso: string, now: Date): boolean {
  const start = weekStartOf(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}
