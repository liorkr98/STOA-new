import "server-only";

import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { cachedPage } from "@/lib/cache/page";
import { reportsHaveStance } from "@/lib/db/publication-row";
import type { Direction } from "@/lib/types";

/**
 * Ticker coverage, grouped in Postgres (migration 0054) instead of shipping
 * thousands of rows to be counted in Node. Stance activity (who has a live
 * publication with a direction on a name) is counted here from one cached
 * read of those publications.
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

/** A live publication that declares a stance on a ticker. */
interface LiveStance {
  symbol: string;
  stance: Direction;
  authorId: string;
  reportId: string;
  at: string;
}

const LIVE_STATUSES = ["published", "resolution_pending_review"];
const DIRECTIONS: Direction[] = ["long", "short", "hold"];
const STANCE_PAGE = 1000;

/**
 * Every live publication with a stance. Read from `reports.stance`; until
 * migration 0065 adds that column, from each publication's call, which is
 * the same set (the migration copies every call's direction across).
 */
const liveStances = cache(async (): Promise<LiveStance[]> => {
  const supabase = createPublicClient();
  const out: LiveStance[] = [];
  const push = (symbol: unknown, stance: unknown, authorId: unknown, reportId: unknown, at: unknown) => {
    if (typeof symbol !== "string" || !symbol.trim()) return;
    if (!DIRECTIONS.includes(stance as Direction)) return;
    out.push({
      symbol: symbol.trim().toUpperCase(),
      stance: stance as Direction,
      authorId: String(authorId),
      reportId: String(reportId),
      at: String(at),
    });
  };
  const fromReports = await reportsHaveStance();
  for (let from = 0; ; from += STANCE_PAGE) {
    const to = from + STANCE_PAGE - 1;
    if (fromReports) {
      const { data, error } = await supabase
        .from("reports")
        .select("id, ticker, stance, author_id, published_at, created_at")
        .not("stance", "is", null)
        .in("status", LIVE_STATUSES)
        .order("id")
        .range(from, to);
      if (error || !data) break;
      for (const r of data) push(r.ticker, r.stance, r.author_id, r.id, r.published_at ?? r.created_at);
      if (data.length < STANCE_PAGE) break;
    } else {
      const { data, error } = await supabase
        .from("predictions")
        .select("report_id, direction, author_id, report:reports!inner(ticker, status, published_at, created_at)")
        .in("report.status", LIVE_STATUSES)
        .order("id")
        .range(from, to);
      if (error || !data) break;
      for (const row of data as unknown as {
        report_id: string;
        direction: string;
        author_id: string;
        report: { ticker: string | null; published_at: string | null; created_at: string } | null;
      }[]) {
        const r = row.report;
        if (r) push(r.ticker, row.direction, row.author_id, row.report_id, r.published_at ?? r.created_at);
      }
      if (data.length < STANCE_PAGE) break;
    }
  }
  return out;
});

/**
 * Per ticker: how many analysts have a live publication with a stance on it,
 * how many of those publications are long and how many short, and when the
 * first one landed. Counts publications, not calls.
 */
export async function callActivity(): Promise<Map<string, CallActivityEntry>> {
  const entries = await cachedPage("coverage:stance-activity", COVERAGE_TTL_S, async () => {
    const bySymbol = new Map<string, CallActivityEntry & { authors: Set<string> }>();
    for (const s of await liveStances()) {
      const e = bySymbol.get(s.symbol) ?? { analysts: 0, long: 0, short: 0, firstAt: s.at, authors: new Set<string>() };
      e.authors.add(s.authorId);
      if (s.stance === "long") e.long += 1;
      if (s.stance === "short") e.short += 1;
      if (s.at < e.firstAt) e.firstAt = s.at;
      bySymbol.set(s.symbol, e);
    }
    return [...bySymbol].map(
      ([symbol, { authors, ...e }]) => [symbol, { ...e, analysts: authors.size }] as [string, CallActivityEntry],
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

/**
 * The first live publication with a stance on each ticker, newest first.
 * Powers the Markets "newly called" band.
 */
export async function firstCallsRecent(limit: number): Promise<FirstCallRow[]> {
  return cachedPage(`coverage:first-stances:${limit}`, COVERAGE_TTL_S, async () => {
    const first = new Map<string, LiveStance>();
    for (const s of await liveStances()) {
      const seen = first.get(s.symbol);
      if (!seen || s.at < seen.at) first.set(s.symbol, s);
    }
    return [...first.values()]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit)
      .map((s) => ({ symbol: s.symbol, direction: s.stance, calledAt: s.at, reportId: s.reportId, authorId: s.authorId }));
  });
}
