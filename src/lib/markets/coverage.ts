import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { cachedPage } from "@/lib/cache/page";
import type { Direction } from "@/lib/types";

/**
 * Ticker coverage and call activity, grouped in Postgres (migration 0054)
 * instead of shipping thousands of rows to be counted in Node.
 *
 * Cached across Vercel isolates (not just in-process): coverage only changes
 * when something is published, so a minute of staleness is invisible. Windowed
 * keys are bucketed to the minute; using Date.now() in the key used to miss
 * on every request.
 */

const COVERAGE_TTL_S = 60;

export interface CallActivityEntry {
  analysts: number;
  long: number;
  short: number;
  firstAt: string;
}

/** Stable timestamp so a 60s cache actually hits. */
function bucketIso(d: Date): string {
  const ms = 60_000;
  return new Date(Math.floor(d.getTime() / ms) * ms).toISOString();
}

export async function coverageAllTime(): Promise<Map<string, number>> {
  const entries = await cachedPage("coverage:all", COVERAGE_TTL_S, async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("ticker_coverage_counts");
    if (error || !data) return [] as [string, number][];
    return ((data as { symbol: string; report_count: number }[]) ?? []).map(
      (r) => [r.symbol, Number(r.report_count)] as [string, number],
    );
  });
  return new Map(entries);
}

export async function coverageWindow(since?: Date, until?: Date): Promise<Map<string, number>> {
  const sinceIso = since ? bucketIso(since) : null;
  const untilIso = until ? bucketIso(until) : null;
  const entries = await cachedPage(`coverage:win:${sinceIso ?? "-"}:${untilIso ?? "-"}`, COVERAGE_TTL_S, async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("ticker_coverage_window", {
      p_since: sinceIso,
      p_until: untilIso,
    });
    if (error || !data) return [] as [string, number][];
    return ((data as { symbol: string; report_count: number }[]) ?? []).map(
      (r) => [r.symbol, Number(r.report_count)] as [string, number],
    );
  });
  return new Map(entries);
}

export async function callActivity(): Promise<Map<string, CallActivityEntry>> {
  const entries = await cachedPage("coverage:activity", COVERAGE_TTL_S, async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("ticker_call_activity");
    if (error || !data) return [] as [string, CallActivityEntry][];
    return (
      (data as
        | {
            symbol: string;
            analysts: number;
            long_open: number;
            short_open: number;
            first_at: string;
          }[]
        | null) ?? []
    ).map(
      (r) =>
        [
          r.symbol,
          {
            analysts: Number(r.analysts),
            long: Number(r.long_open),
            short: Number(r.short_open),
            firstAt: r.first_at,
          },
        ] as [string, CallActivityEntry],
    );
  });
  return new Map(entries);
}

/**
 * Coverage counts for a handful of symbols. Callers that only need a few (a
 * ticker page's peer badges) should use this rather than pulling the whole map.
 */
export async function coverageFor(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const all = await coverageAllTime();
  const out: Record<string, number> = {};
  for (const s of symbols) {
    const sym = s.toUpperCase();
    out[sym] = all.get(sym) ?? 0;
  }
  return out;
}

export interface FirstCallRow {
  symbol: string;
  direction: Direction;
  calledAt: string;
  reportId: string;
  authorId: string;
}

const DIRECTIONS: Direction[] = ["long", "short", "hold"];

/**
 * The earliest call per ticker, newest first. Powers the Markets "newly called"
 * band without shipping 2000 prediction rows to Node.
 */
export async function firstCallsRecent(limit: number): Promise<FirstCallRow[]> {
  return cachedPage(`coverage:first-calls:${limit}`, COVERAGE_TTL_S, async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("first_calls_recent", { p_limit: limit });
    if (error || !data) return [];
    return ((data as {
      symbol: string;
      direction: string;
      called_at: string;
      report_id: string;
      author_id: string;
    }[]) ?? []).flatMap((row) => {
      if (!DIRECTIONS.includes(row.direction as Direction)) return [];
      return [
        {
          symbol: row.symbol.toUpperCase(),
          direction: row.direction as Direction,
          calledAt: row.called_at,
          reportId: row.report_id,
          authorId: row.author_id,
        },
      ];
    });
  });
}
