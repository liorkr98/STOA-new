"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * localStorage-backed portfolio (Part G), same approach as useWatchlist until a
 * real `portfolios` table exists (see docs/BACKEND_DATA_CONTRACTS.md). Private
 * to the browser; a holding is a ticker with a share count and a cost basis.
 */

const STORAGE_KEY = "stoa-portfolio";

export interface Holding {
  ticker: string;
  shares: number;
  /** Total cost basis for the position (not per share). */
  cost: number;
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setHoldings(raw ? JSON.parse(raw) : []);
    } catch {
      setHoldings([]);
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Holding[]) => {
    setHoldings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const upsert = useCallback(
    (holding: Holding) => {
      setHoldings((prev) => {
        const next = [...prev.filter((h) => h.ticker !== holding.ticker), holding];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const remove = useCallback(
    (ticker: string) => {
      setHoldings((prev) => {
        const next = prev.filter((h) => h.ticker !== ticker);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { holdings, ready, upsert, remove };
}
