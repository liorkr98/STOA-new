"use client";

import { useCallback, useMemo } from "react";
import { useHydrated, useStoredValue } from "@/lib/hooks/use-stored-value";

/**
 * localStorage-backed portfolio (Part G), same approach as useWatchlist until a
 * real `portfolios` table exists (see docs/BACKEND_DATA_CONTRACTS.md). Private
 * to the browser; a holding is a ticker with a share count and a cost basis.
 *
 * Storage is the source of truth: the hook reads it rather than copying it into
 * state on mount, so two portfolio views (and a second tab) stay in step.
 */

const STORAGE_KEY = "stoa-portfolio";
const PORTFOLIO_EVENT = "stoa-portfolio-changed";

const identity = (raw: string | null) => raw;
const EMPTY: Holding[] = [];

export interface Holding {
  ticker: string;
  shares: number;
  /** Total cost basis for the position (not per share). */
  cost: number;
}

export function usePortfolio() {
  // Held as the raw string: the snapshot has to compare by value, so the array
  // is parsed out of it rather than being the snapshot itself.
  const raw = useStoredValue(STORAGE_KEY, identity, null, PORTFOLIO_EVENT);
  const ready = useHydrated();

  const holdings = useMemo<Holding[]>(() => {
    if (!raw) return EMPTY;
    try {
      const parsed = JSON.parse(raw) as Holding[];
      return Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      return EMPTY;
    }
  }, [raw]);

  const persist = useCallback((next: Holding[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(PORTFOLIO_EVENT));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const upsert = useCallback(
    (holding: Holding) => {
      persist([...holdings.filter((h) => h.ticker !== holding.ticker), holding]);
    },
    [holdings, persist],
  );

  const remove = useCallback(
    (ticker: string) => {
      persist(holdings.filter((h) => h.ticker !== ticker));
    },
    [holdings, persist],
  );

  return { holdings, ready, upsert, remove };
}
