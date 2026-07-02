"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "stoa-watchlist";

/**
 * localStorage-backed until a real `watchlists` table exists (see
 * docs/BACKEND_DATA_CONTRACTS.md) -- gives a genuinely working feature
 * without inventing backend persistence that isn't there.
 */
export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setTickers(raw ? JSON.parse(raw) : []);
    } catch {
      setTickers([]);
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: string[]) => {
    setTickers(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable, keep in-memory only */
    }
  }, []);

  const toggle = useCallback(
    (ticker: string) => {
      setTickers((prev) => {
        const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { tickers, ready, toggle, has: (ticker: string) => tickers.includes(ticker) };
}
