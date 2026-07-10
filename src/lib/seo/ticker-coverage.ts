import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Single guard for "does this ticker have any real content", used by both
 * the /markets/[ticker] noindex decision and sitemap.ts's inclusion filter.
 * One query shape in one place so the two can't drift out of sync (a ticker
 * page and its sitemap entry disagreeing on indexability is its own SEO bug).
 */
export async function publishedReportCount(ticker: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("ticker", ticker.toUpperCase())
    .eq("status", "published")
    .not("locked_at", "is", null);
  return count ?? 0;
}

export async function hasPublishedReports(ticker: string): Promise<boolean> {
  return (await publishedReportCount(ticker)) > 0;
}

/** Whether any resolved (non-open) call exists for this ticker -- the line
 * between "locked, fact-checked research" and "verified track record" copy. */
export async function hasResolvedHistory(ticker: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("ticker", ticker.toUpperCase())
    .neq("outcome", "open");
  return (count ?? 0) > 0;
}

/** Coverage counts for every ticker with at least one published report --
 * powers the sitemap's tickers list and its priority tiering. */
export async function allTickerCoverage(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("ticker")
    .eq("status", "published")
    .not("locked_at", "is", null)
    .not("ticker", "is", null)
    .limit(5000);
  const counts: Record<string, number> = {};
  for (const row of (data as { ticker: string | null }[]) ?? []) {
    if (row.ticker) counts[row.ticker] = (counts[row.ticker] ?? 0) + 1;
  }
  return counts;
}
