"use client";

import { useCallback, useEffect, useState } from "react";
import { toggleInstrumentFollow } from "@/app/actions/follows-instruments";

const STORAGE_KEY = "stoa-watchlist";
const SECTOR_STORAGE_KEY = "stoa-sector-watchlist";
const IMPORTED_FLAG = "stoa-follows-imported";

type FollowKind = "ticker" | "etf" | "sector" | "theme";

/**
 * Instrument follows, server-backed for signed-in readers (follows_instruments,
 * migration 0052) with localStorage as the signed-out fallback.
 *
 * The hook's shape is unchanged so every existing call site keeps working. On
 * mount it paints from localStorage (no waiting on the network), then reconciles
 * with the server: the local list is imported once per browser, and the server
 * list becomes the source of truth afterwards so a follow survives a device
 * change.
 */
export function useWatchlist() {
  return useInstrumentFollows(STORAGE_KEY, "ticker");
}

/**
 * Followed sectors, kept in a separate key so a sector name can never collide
 * with a ticker symbol.
 */
export function useSectorWatchlist() {
  const { tickers, ...rest } = useInstrumentFollows(SECTOR_STORAGE_KEY, "sector");
  return { sectors: tickers, ...rest };
}

function readLocal(storageKey: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(storageKey: string, value: string[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* storage unavailable, keep in-memory only */
  }
}

function useInstrumentFollows(storageKey: string, kind: FollowKind) {
  const [tickers, setTickers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = readLocal(storageKey);
    setTickers(local);
    setReady(true);

    // Reconcile with the server. A guest response leaves the local list alone.
    void (async () => {
      try {
        const res = await fetch("/api/follows/instruments", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, unknown> & { signedIn?: boolean };
        if (cancelled || !data.signedIn) return;

        const remote = Array.isArray(data[kind]) ? (data[kind] as string[]) : [];
        const importedKey = `${IMPORTED_FLAG}:${storageKey}`;
        const alreadyImported = window.localStorage.getItem(importedKey) === "1";
        const missing = local.filter((s) => !remote.includes(s));

        if (!alreadyImported && missing.length > 0) {
          await fetch("/api/follows/instruments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: missing.map((symbol) => ({ kind, symbol })) }),
          }).catch(() => undefined);
          window.localStorage.setItem(importedKey, "1");
        } else if (!alreadyImported) {
          window.localStorage.setItem(importedKey, "1");
        }

        const merged = [...new Set([...remote, ...missing])];
        if (cancelled) return;
        setTickers(merged);
        writeLocal(storageKey, merged);
      } catch {
        // Offline or signed out: the local list already painted.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storageKey, kind]);

  const toggle = useCallback(
    (symbol: string) => {
      setTickers((prev) => {
        const following = prev.includes(symbol);
        const next = following ? prev.filter((t) => t !== symbol) : [...prev, symbol];
        writeLocal(storageKey, next);
        // Fire-and-forget: a signed-out reader gets an error we intentionally
        // ignore, since localStorage already holds the change.
        void toggleInstrumentFollow(kind, symbol, following).catch(() => undefined);
        return next;
      });
    },
    [storageKey, kind],
  );

  return { tickers, ready, toggle, has: (symbol: string) => tickers.includes(symbol) };
}
