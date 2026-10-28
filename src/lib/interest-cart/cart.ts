import type { InterestCartStore } from "@/lib/interest-cart/store";
import type {
  CartDirection,
  CartRow,
  CartSource,
  CartTap,
  CartTapContext,
  CartWeek,
} from "@/lib/interest-cart/types";
import { WEEK_STARTS_ON, parseWeekKey, weekBounds, weekKey, weekStartOf } from "@/lib/interest-cart/week";

const TICKER = /^[A-Z0-9.=^-]{1,12}$/;

export function normaliseTicker(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  return TICKER.test(t) ? t : null;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const MAX_TITLE = 300;

function cleanText(raw: string | null | undefined, max: number): string | null {
  const t = (raw ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

/** A site path only: starts with one "/", no scheme or host, at most 300 characters. */
export function cleanPath(raw: string | null | undefined): string | null {
  const p = (raw ?? "").trim();
  return /^\/(?!\/)[^\s]*$/.test(p) ? p.slice(0, MAX_TITLE) : null;
}

/** Taps to rows: bull and bear counted apart, most-tapped first. */
export function summariseWeek(weekStart: string, taps: CartTap[]): CartWeek {
  const byTicker = new Map<string, CartRow>();
  for (const t of taps) {
    const row = byTicker.get(t.ticker) ?? { ticker: t.ticker, bull: 0, bear: 0, total: 0 };
    row[t.direction] += 1;
    row.total += 1;
    byTicker.set(t.ticker, row);
  }
  const rows = [...byTicker.values()].sort((a, b) => b.total - a.total || a.ticker.localeCompare(b.ticker));
  return { weekStart, rows, tickers: rows.length, taps: taps.length };
}

/**
 * The cart for one signed-in person. These calls are the whole API.
 * Signed-out taps never reach here: they are held (held-tap.ts) and replayed
 * through `addTap` once there is a session.
 */
export function createInterestCart(store: InterestCartStore, userId: string) {
  return {
    async addTap(
      ticker: string,
      direction: CartDirection,
      source: CartSource,
      context: CartTapContext = {},
    ): Promise<{ tap: CartTap; inserted: boolean }> {
      const symbol = normaliseTicker(ticker);
      if (!symbol) throw new Error(`Not a ticker: ${ticker}`);
      const fromVideo = source === "extension";
      const tap: CartTap = {
        id: context.id ?? newId(),
        userId,
        ticker: symbol,
        direction,
        source,
        videoId: fromVideo ? (context.videoId ?? null) : null,
        videoChannel: fromVideo ? (context.videoChannel ?? null) : null,
        videoSeconds: fromVideo ? (context.videoSeconds ?? null) : null,
        videoTitle: fromVideo ? cleanText(context.videoTitle, MAX_TITLE) : null,
        sourcePath: fromVideo ? null : cleanPath(context.sourcePath),
        createdAt: (context.at ?? new Date()).toISOString(),
      };
      const { inserted } = await store.insert(tap);
      return { tap, inserted };
    },

    /** The tap toast's Undo: the newest counted tap on a ticker stops counting (kept, not deleted). */
    async undoLastTap(ticker: string, now: Date = new Date()): Promise<CartTap | null> {
      const symbol = normaliseTicker(ticker);
      return symbol ? store.removeLatest(userId, symbol, { id: newId(), at: now, reason: "undo" }) : null;
    },

    /**
     * Takes a ticker out of the CURRENT week: every tap on it, both sides.
     * Only the week containing `now`; a closed week is a record and cannot be
     * edited. Soft: the taps are kept and `restoreRemoval` brings exactly
     * them back. Tapping the ticker again starts a fresh count.
     */
    async removeTicker(ticker: string, now: Date = new Date()): Promise<{ removalId: string; removed: number } | null> {
      const symbol = normaliseTicker(ticker);
      if (!symbol) return null;
      const { fromIso, toIso } = weekBounds(weekStartOf(now));
      const removalId = newId();
      const removed = await store.removeTicker(userId, symbol, fromIso, toIso, { id: removalId, at: now, reason: "remove" });
      return removed > 0 ? { removalId, removed } : null;
    },

    /** Undo for `removeTicker`: the same taps count again, so the row is exactly as it was. */
    async restoreRemoval(removalId: string): Promise<number> {
      return store.restore(userId, removalId);
    },

    /** A week by its start: a Date anywhere in it, or its YYYY-MM-DD key. */
    async getWeek(weekStart: Date | string): Promise<CartWeek> {
      const at = typeof weekStart === "string" ? parseWeekKey(weekStart) : weekStart;
      const start = weekStartOf(at ?? new Date());
      const { fromIso, toIso } = weekBounds(start);
      return summariseWeek(weekKey(start), await store.listBetween(userId, fromIso, toIso));
    },

    /** "Where you saw it": the counted taps on one ticker in one week, newest first. */
    async sources(weekStart: string, ticker: string): Promise<CartTap[]> {
      const symbol = normaliseTicker(ticker);
      const at = parseWeekKey(weekStart);
      if (!symbol || !at) return [];
      const { fromIso, toIso } = weekBounds(weekStartOf(at));
      const taps = await store.listBetween(userId, fromIso, toIso);
      return taps.filter((t) => t.ticker === symbol).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    /** Every week with at least one tap, newest first. */
    async listWeeks(): Promise<string[]> {
      return store.listWeekKeys(userId, WEEK_STARTS_ON);
    },
  };
}

export type InterestCart = ReturnType<typeof createInterestCart>;
