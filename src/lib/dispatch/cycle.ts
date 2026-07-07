/** Dispatch cycle windows (America/New_York dateline, rolling 24h content window). */

const TZ = "America/New_York";
const DISPATCH_EPOCH = "2026-07-01";

export interface CycleWindow {
  start: Date;
  end: Date;
  dateLabel: string;
  dateIso: string;
}

function nyYmd(at: Date, dayOffset = 0): string {
  const shifted = new Date(at.getTime() + dayOffset * 86_400_000);
  return shifted.toLocaleDateString("en-CA", { timeZone: TZ });
}

function nyDateline(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  return noon
    .toLocaleDateString("en-US", {
      timeZone: TZ,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

/** Current dispatch window anchored to the NY calendar day label. */
export function getCycleWindow(at: Date = new Date(), dayOffset = 0): CycleWindow {
  const end = new Date(at.getTime() + dayOffset * 86_400_000);
  const start = new Date(end.getTime() - 24 * 3_600_000);
  const dateIso = nyYmd(end, 0);
  return {
    start,
    end,
    dateIso,
    dateLabel: nyDateline(dateIso),
  };
}

export function formatDispatchDateline(dateIso: string): string {
  return nyDateline(dateIso);
}

export function fallbackIssueNumber(dateIso: string): number {
  const epoch = new Date(`${DISPATCH_EPOCH}T17:00:00Z`);
  const current = new Date(`${dateIso}T17:00:00Z`);
  const diff = Math.floor((current.getTime() - epoch.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}
