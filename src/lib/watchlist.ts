"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "stoa-watchlist";
const SECTOR_STORAGE_KEY = "stoa-sector-watchlist";

/**
 * localStorage-backed until a real `watchlists` table exists (see
 * docs/BACKEND_DATA_CONTRACTS.md) -- gives a genuinely working feature
 * without inventing backend persistence that isn't there.
 */
export function useWatchlist() {
  return useLocalFollows(STORAGE_KEY);
}

/**
 * Followed sectors, kept in a separate key so a sector name can never collide
 * with a ticker symbol. Same storage caveat as the instrument watchlist.
 */
export function useSectorWatchlist() {
  const { tickers, ...rest } = useLocalFollows(SECTOR_STORAGE_KEY);
  return { sectors: tickers, ...rest };
}

function useLocalFollows(storageKey: string) {
  const [tickers, setTickers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setTickers(raw ? JSON.parse(raw) : []);
    } catch {
      setTickers([]);
    }
    setReady(true);
  }, [storageKey]);

  const persist = useCallback(
    (next: string[]) => {
      setTickers(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage unavailable, keep in-memory only */
      }
    },
    [storageKey],
  );

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
