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
 * The cart for one signed-in person. These four calls are the whole API.
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
        createdAt: (context.at ?? new Date()).toISOString(),
      };
      const { inserted } = await store.insert(tap);
      return { tap, inserted };
    },

    async undoLastTap(ticker: string): Promise<CartTap | null> {
      const symbol = normaliseTicker(ticker);
      return symbol ? store.removeLatest(userId, symbol) : null;
    },

    /** A week by its start: a Date anywhere in it, or its YYYY-MM-DD key. */
    async getWeek(weekStart: Date | string): Promise<CartWeek> {
      const at = typeof weekStart === "string" ? parseWeekKey(weekStart) : weekStart;
      const start = weekStartOf(at ?? new Date());
      const { fromIso, toIso } = weekBounds(start);
      return summariseWeek(weekKey(start), await store.listBetween(userId, fromIso, toIso));
    },

    /** Every week with at least one tap, newest first. */
    async listWeeks(): Promise<string[]> {
      return store.listWeekKeys(userId, WEEK_STARTS_ON);
    },
  };
}

export type InterestCart = ReturnType<typeof createInterestCart>;
