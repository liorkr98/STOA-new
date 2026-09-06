"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResolvedSymbol } from "@/lib/market/resolve-symbol";

/**
 * What the call block knows about the symbol in its field, right now.
 *
 * "checking" is the honest state while the answer is on its way: the step's
 * forward button reads it and waits rather than advancing on a symbol nobody
 * has looked at yet. "failed" is the lookup itself breaking (no network, a
 * server error), which is different from the symbol not existing, and is
 * said differently.
 */
export type SymbolLookup =
  | { status: "idle" }
  | { status: "checking"; symbol: string }
  | { status: "found"; symbol: string; resolved: ResolvedSymbol }
  | { status: "missing"; symbol: string }
  | { status: "failed"; symbol: string };

type Outcome =
  | { kind: "found"; resolved: ResolvedSymbol }
  | { kind: "missing" }
  | { kind: "failed" };

/** Typing pauses this long before the symbol is looked up. */
const SETTLE_MS = 450;

/**
 * Looks a symbol up as it is typed, and remembers every answer for the life
 * of the editor, so moving between steps or retyping a symbol never asks
 * twice. `retry` forgets one answer, for the case where the lookup failed
 * rather than the symbol being wrong.
 */
export function useSymbolLookup(
  ticker: string,
  enabled = true,
): { lookup: SymbolLookup; retry: () => void } {
  const symbol = ticker.trim().toUpperCase();
  const [known, setKnown] = useState<ReadonlyMap<string, Outcome>>(() => new Map());

  useEffect(() => {
    if (!enabled || !symbol || known.has(symbol)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      let outcome: Outcome;
      try {
        const res = await fetch(`/api/market/resolve?ticker=${encodeURIComponent(symbol)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`resolve ${res.status}`);
        const resolved = (await res.json()) as ResolvedSymbol;
        outcome = resolved.found ? { kind: "found", resolved } : { kind: "missing" };
      } catch {
        if (controller.signal.aborted) return;
        outcome = { kind: "failed" };
      }
      setKnown((prev) => new Map(prev).set(symbol, outcome));
    }, SETTLE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [symbol, enabled, known]);

  const retry = useCallback(() => {
    setKnown((prev) => {
      if (!prev.has(symbol)) return prev;
      const next = new Map(prev);
      next.delete(symbol);
      return next;
    });
  }, [symbol]);

  let lookup: SymbolLookup;
  if (!enabled || !symbol) lookup = { status: "idle" };
  else {
    const hit = known.get(symbol);
    if (!hit) lookup = { status: "checking", symbol };
    else if (hit.kind === "found") lookup = { status: "found", symbol, resolved: hit.resolved };
    else lookup = { status: hit.kind, symbol };
  }
  return { lookup, retry };
}
