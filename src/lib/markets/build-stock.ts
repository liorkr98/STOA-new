import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Candle } from "@/lib/market/candle-types";
import type { Prediction, Profile } from "@/lib/types";
import type {
  OpenCall,
  ResolvedCall,
  StockAnalyst,
  StockConsensus,
} from "@/lib/markets/call-types";

export type {
  OpenCall,
  ResolvedCall,
  StockAnalyst,
  StockConsensus,
} from "@/lib/markets/call-types";
export { MAX_TARGET_LINES } from "@/lib/markets/call-types";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toAnalyst(profile: Profile): StockAnalyst {
  return {
    handle: profile.handle,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    score: profile.score || null,
    provisional: (profile.sample_size ?? 0) < 10,
    initials: initialsOf(profile.display_name),
  };
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

/**
 * Every Stoa call on one instrument, split into the open targets the chart
 * draws as lines and the resolved calls it stamps with seals.
 */
export interface StockCallsPayload {
  openCalls: OpenCall[];
  resolvedCalls: ResolvedCall[];
  consensus: StockConsensus;
}

export async function buildStockCalls(ticker: string): Promise<StockCallsPayload> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select(
      "*, author:profiles!predictions_author_id_fkey(*), report:reports!predictions_report_id_fkey(id, status)",
    )
    .eq("ticker", ticker.toUpperCase())
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data as (Prediction & {
    author?: Profile | null;
    report?: { id: string; status: string } | null;
  })[]) ?? [];

  const openCalls: OpenCall[] = [];
  const resolvedCalls: ResolvedCall[] = [];
  const now = new Date();

  for (const p of rows) {
    if (!p.author || !p.report) continue;
    if (!["published", "resolution_pending_review"].includes(p.report.status)) continue;
    const analyst = toAnalyst(p.author);
    const lockedAt = p.created_at;

    if (p.outcome === "open") {
      openCalls.push({
        reportId: p.report.id,
        analyst,
        direction: p.direction,
        entryPrice: p.lock_price,
        targetPrice: p.target_price,
        lockedAt,
        resolvesAt: p.resolves_at,
        daysLeft: daysBetween(now, new Date(p.resolves_at)),
      });
    } else {
      resolvedCalls.push({
        reportId: p.report.id,
        analyst,
        direction: p.direction,
        entryPrice: p.lock_price,
        exitPrice: p.resolved_price,
        returnPct: p.return_pct,
        outcome: p.outcome,
        lockedAt,
        resolvedAt: p.resolution_trading_date ?? p.resolves_at,
      });
    }
  }

  // Highest Track Score first: the chart draws the five most credible targets
  // as labelled lines and folds the rest into a consensus band.
  openCalls.sort((a, b) => (b.analyst.score ?? 0) - (a.analyst.score ?? 0));

  const targets = openCalls.map((c) => c.targetPrice).filter((t): t is number => t != null);
  const scores = openCalls.map((c) => c.analyst.score).filter((s): s is number => s != null);
  const hits = resolvedCalls.filter((c) => c.outcome === "hit").length;

  const consensus: StockConsensus = {
    openCount: openCalls.length,
    long: openCalls.filter((c) => c.direction === "long").length,
    short: openCalls.filter((c) => c.direction === "short").length,
    averageTarget: targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : null,
    averageScore: scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null,
    hitRatePct: resolvedCalls.length
      ? Math.round((hits / resolvedCalls.length) * 100)
      : null,
    resolvedCount: resolvedCalls.length,
  };

  return { openCalls, resolvedCalls, consensus };
}

/** Client-safe chart payload: the price line plus the calls drawn on it. */
export interface CallsChartData {
  candles: Candle[];
  openCalls: OpenCall[];
  resolvedCalls: ResolvedCall[];
}
