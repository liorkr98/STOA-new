"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useHydrated, useStoredValue } from "@/lib/hooks/use-stored-value";
import { toggleInstrumentFollow } from "@/app/actions/follows-instruments";

const STORAGE_KEY = "stoa-watchlist";
const SECTOR_STORAGE_KEY = "stoa-sector-watchlist";
const IMPORTED_FLAG = "stoa-follows-imported";
const FOLLOWS_EVENT = "stoa-follows-changed";

const identity = (raw: string | null) => raw;
const EMPTY: string[] = [];

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
    // Storage is what the hook renders from, so every writer announces itself.
    window.dispatchEvent(new Event(FOLLOWS_EVENT));
  } catch {
    /* storage unavailable, keep in-memory only */
  }
}

function useInstrumentFollows(storageKey: string, kind: FollowKind) {
  // Rendered straight from storage, so the server reconcile below and a second
  // tab both land without an effect copying values into state.
  const raw = useStoredValue(storageKey, identity, null, FOLLOWS_EVENT);
  const ready = useHydrated();

  const tickers = useMemo<string[]>(() => {
    if (!raw) return EMPTY;
    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      return EMPTY;
    }
  }, [raw]);

  useEffect(() => {
    let cancelled = false;
    const local = readLocal(storageKey);

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
      const current = readLocal(storageKey);
      const following = current.includes(symbol);
      const next = following ? current.filter((t) => t !== symbol) : [...current, symbol];
      writeLocal(storageKey, next);
      // Fire-and-forget: a signed-out reader gets an error we intentionally
      // ignore, since localStorage already holds the change.
      void toggleInstrumentFollow(kind, symbol, following).catch(() => undefined);
    },
    [storageKey, kind],
  );

  return { tickers, ready, toggle, has: (symbol: string) => tickers.includes(symbol) };
}
