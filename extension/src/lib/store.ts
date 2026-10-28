import type { LocalTap, SiteWeek, StoaSession, WeekRow } from "@/lib/types";
import { inWeekOf, weekStartOf } from "@/lib/week";

/** Everything the extension keeps, in chrome.storage.local. */
export type Stored = {
  session: StoaSession | null;
  taps: LocalTap[];
  siteWeek: SiteWeek | null;
  quiet: boolean;
};

export const DEFAULTS: Stored = { session: null, taps: [], siteWeek: null, quiet: false };

export async function readStored(): Promise<Stored> {
  const got = (await browser.storage.local.get(Object.keys(DEFAULTS) as (keyof Stored)[])) as Partial<Stored>;
  return { ...DEFAULTS, ...got };
}

export async function writeStored(patch: Partial<Stored>): Promise<void> {
  await browser.storage.local.set(patch);
}

function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * This week's bull and bear counts per ticker: what the site last reported
 * for the signed-in reader, plus the extension's own taps the site does not
 * have yet, minus delivered taps undone since. Signed out, the held taps
 * alone. Bull and bear are counted apart; there is never a net figure.
 */
export function weekCounts(stored: Pick<Stored, "session" | "taps" | "siteWeek">, now = new Date()): WeekRow[] {
  const userId = stored.session?.userId ?? null;
  const rows = new Map<string, WeekRow>();
  const add = (ticker: string, side: "bull" | "bear", n: number) => {
    const row = rows.get(ticker) ?? { ticker, bull: 0, bear: 0 };
    row[side] = Math.max(0, row[side] + n);
    rows.set(ticker, row);
  };
  const site = stored.siteWeek;
  if (userId && site && site.userId === userId && site.weekStart === localDay(weekStartOf(now))) {
    for (const r of site.rows) {
      add(r.ticker, "bull", r.bull);
      add(r.ticker, "bear", r.bear);
    }
  }
  for (const t of stored.taps) {
    if (!inWeekOf(t.at, now)) continue;
    if (userId ? t.userId !== userId && t.userId !== null : t.userId !== null) continue;
    if (t.status === "delivered") {
      if (t.undone && !t.undoDelivered && site) add(t.ticker, t.direction, -1);
    } else if (!t.undone) {
      add(t.ticker, t.direction, 1);
    }
  }
  return [...rows.values()].filter((r) => r.bull + r.bear > 0).sort((a, b) => b.bull + b.bear - (a.bull + a.bear) || a.ticker.localeCompare(b.ticker));
}

/** Taps made while signed out and not yet saved: the "N stocks picked" card. */
export function heldTickers(taps: LocalTap[]): string[] {
  return [...new Set(taps.filter((t) => t.status === "held" && !t.undone).map((t) => t.ticker))];
}
