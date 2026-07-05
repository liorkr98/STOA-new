"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "stoa-watchlist";
// Same-tab broadcast: the browser `storage` event only fires in *other* tabs,
// so we dispatch our own event to keep every hook instance in this tab in sync.
const SYNC_EVENT = "stoa-watchlist-sync";

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * localStorage-backed until a real `watchlists` table exists (see
 * docs/BACKEND_DATA_CONTRACTS.md) -- gives a genuinely working feature
 * without inventing backend persistence that isn't there.
 *
 * Every hook instance stays in sync: a toggle broadcasts to other instances in
 * the same tab (custom event) and to other tabs (native `storage` event), so a
 * star on Markets and the /watchlist page never drift apart.
 */
export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTickers(read());
    setReady(true);

    const sync = () => setTickers(read());
    window.addEventListener(SYNC_EVENT, sync);
    // Native storage event fires for cross-tab writes only.
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    setTickers(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable, keep in-memory only */
    }
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  const toggle = useCallback(
    (ticker: string) => {
      const prev = read();
      const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      persist(next);
    },
    [persist],
  );

  return { tickers, ready, toggle, has: (ticker: string) => tickers.includes(ticker) };
}
