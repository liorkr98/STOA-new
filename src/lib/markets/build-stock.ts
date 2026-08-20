import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Candle } from "@/lib/market/candle-types";
import type { Prediction, Profile } from "@/lib/types";
import type {
  OpenCall,
  ResolvedCall,
  StockAnalyst,
  StockCoverage,
} from "@/lib/markets/call-types";

export type {
  OpenCall,
  ResolvedCall,
  StockAnalyst,
  StockCoverage,
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
  coverage: StockCoverage;
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

  // Newest call first. Ordering by Track Score would rank the analysts against
  // each other, which is exactly what this surface no longer does.
  openCalls.sort((a, b) => b.lockedAt.localeCompare(a.lockedAt));

  const hits = resolvedCalls.filter((c) => c.outcome === "hit").length;

  const coverage: StockCoverage = {
    openCount: openCalls.length,
    analystCount: new Set(openCalls.map((c) => c.analyst.handle)).size,
    hitRatePct: resolvedCalls.length
      ? Math.round((hits / resolvedCalls.length) * 100)
      : null,
    resolvedCount: resolvedCalls.length,
  };

  return { openCalls, resolvedCalls, coverage };
}

/** Client-safe chart payload: the price line plus the calls drawn on it. */
export interface CallsChartData {
  candles: Candle[];
  openCalls: OpenCall[];
  resolvedCalls: ResolvedCall[];
}
