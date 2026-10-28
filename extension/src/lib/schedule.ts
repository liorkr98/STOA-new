import type { VideoTicker } from "@/lib/types";

export type ScheduleState = {
  /** Tickers whose card has popped up once in this video. */
  shown: ReadonlySet<string>;
  /** Tickers the reader closed with the cross: never pop again in this video. */
  dismissed: ReadonlySet<string>;
  quiet: boolean;
};

/**
 * The card that should pop up at `t`, if any: a card-worthy ticker whose
 * stretch of discussion `t` falls in, not yet shown and not dismissed. A seek
 * into the middle of a stretch still pops it; a seek past it does not. When
 * stretches overlap, the one that started last wins.
 */
export function cardDue(items: VideoTicker[], t: number, state: ScheduleState): VideoTicker | null {
  if (state.quiet) return null;
  let due: VideoTicker | null = null;
  for (const item of items) {
    if (item.kind !== "card") continue;
    if (state.shown.has(item.ticker) || state.dismissed.has(item.ticker)) continue;
    if (t < item.start || t >= Math.max(item.end, item.start + 1)) continue;
    if (!due || item.start > due.start) due = item;
  }
  return due;
}

/**
 * The "In this video" line at `t`: every ticker reached so far (by its first
 * moment) or already shown, in the order they came up, and how many are
 * still ahead.
 */
export function lineAt(items: VideoTicker[], t: number, shown: ReadonlySet<string>): { reached: VideoTicker[]; ahead: number } {
  const first = new Map<string, VideoTicker>();
  for (const item of [...items].sort((a, b) => a.start - b.start)) {
    if (!first.has(item.ticker)) first.set(item.ticker, item);
  }
  const all = [...first.values()];
  const reached = all.filter((i) => i.start <= t || shown.has(i.ticker));
  return { reached, ahead: all.length - reached.length };
}

/** "6:35" / "1:02:03". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
