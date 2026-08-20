import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cached } from "@/lib/market/cache";
import type { Direction } from "@/lib/types";

/**
 * Ticker coverage and call activity, grouped in Postgres (migration 0054)
 * instead of shipping thousands of rows to be counted in Node.
 *
 * Every one of these was previously a `.limit(2000)` scan whose rows crossed the
 * wire on each request. Markets ran three coverage windows plus a 2000-row
 * prediction scan plus a 4000-row ticker scan per page view; Today, the landing
 * tape and every ticker page each ran another. They are also cached, because
 * coverage changes only when something is published.
 */

/** Coverage shifts only on publish, so a minute of staleness is invisible. */
const COVERAGE_TTL_MS = 60_000;

export interface CallActivityEntry {
  analysts: number;
  long: number;
  short: number;
  firstAt: string;
}

export async function coverageAllTime(): Promise<Map<string, number>> {
  return cached("coverage:all", COVERAGE_TTL_MS, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ticker_coverage_counts");
    if (error) return new Map<string, number>();
    return new Map(
      ((data as { symbol: string; report_count: number }[] | null) ?? []).map((r) => [
        r.symbol,
        Number(r.report_count),
      ]),
    );
  });
}

export async function coverageWindow(since?: Date, until?: Date): Promise<Map<string, number>> {
  const key = `coverage:win:${since?.toISOString() ?? "-"}:${until?.toISOString() ?? "-"}`;
  return cached(key, COVERAGE_TTL_MS, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ticker_coverage_window", {
      p_since: since?.toISOString() ?? null,
      p_until: until?.toISOString() ?? null,
    });
    if (error) return new Map<string, number>();
    return new Map(
      ((data as { symbol: string; report_count: number }[] | null) ?? []).map((r) => [
        r.symbol,
        Number(r.report_count),
      ]),
    );
  });
}

export async function callActivity(): Promise<Map<string, CallActivityEntry>> {
  return cached("coverage:activity", COVERAGE_TTL_MS, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ticker_call_activity");
    if (error) return new Map<string, CallActivityEntry>();
    return new Map(
      (
        (data as
          | {
              symbol: string;
              analysts: number;
              long_open: number;
              short_open: number;
              first_at: string;
            }[]
          | null) ?? []
      ).map((r) => [
        r.symbol,
        {
          analysts: Number(r.analysts),
          long: Number(r.long_open),
          short: Number(r.short_open),
          firstAt: r.first_at,
        },
      ]),
    );
  });
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
  return cached(`coverage:first-calls:${limit}`, COVERAGE_TTL_MS, async () => {
    const supabase = await createClient();
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
