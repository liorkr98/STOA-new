import type { SupabaseClient } from "@supabase/supabase-js";
import type { Outcome, Prediction } from "@/lib/types";
import { callReturn, computeScore, computeTier, gradeOutcome, type ScoreResult } from "./score";
import { benchmarkReturn, getQuotesBatch } from "./market";
import { expireSubscriptions } from "./subscriptions";
import { getTickerMeta } from "./tickers";
import { effectiveResolutionDate } from "./trading-calendar";

export interface GradeSummary {
  graded: number;
  analystsUpdated: number;
  subscriptionsExpired: number;
  pendingReview: number;
  neutralResolved: number;
}

const BENCHMARK = "SPY";
const UPDATE_CHUNK = 25;

async function logAudit(
  db: SupabaseClient,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  meta: Record<string, unknown>,
) {
  await db.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: meta,
  });
}

/**
 * Resolves open predictions past their timeframe, expires lapsed subscriptions,
 * then recomputes score + rating + tier for each affected analyst.
 */
export async function gradeDuePredictions(db: SupabaseClient): Promise<GradeSummary> {
  const subscriptionsExpired = await expireSubscriptions(db);

  const nowISO = new Date().toISOString();
  const { data, error } = await db
    .from("predictions")
    .select("*")
    .eq("outcome", "open")
    .lte("resolves_at", nowISO)
    .limit(500);
  if (error) throw new Error(error.message);

  const rawDue = (data as Prediction[]) ?? [];
  if (rawDue.length === 0) {
    return { graded: 0, analystsUpdated: 0, subscriptionsExpired, pendingReview: 0, neutralResolved: 0 };
  }

  const reportIds = [...new Set(rawDue.map((p) => p.report_id))];
  const { data: reportRows } = await db.from("reports").select("id, status").in("id", reportIds);
  const blocked = new Set(
    (reportRows ?? [])
      .filter((r) => r.status === "resolution_pending_review")
      .map((r) => r.id as string),
  );
  const due = rawDue.filter((p) => !blocked.has(p.report_id));
  if (due.length === 0) {
    return { graded: 0, analystsUpdated: 0, subscriptionsExpired, pendingReview: 0, neutralResolved: 0 };
  }

  const quotes = await getQuotesBatch(
    due.map((p) => p.ticker),
    { allowMock: false },
  );
  const spy = quotes.get(BENCHMARK);
  const affected = new Set<string>();
  let pendingReview = 0;
  let neutralResolved = 0;

  type RowUpdate = {
    id: string;
    report_id: string;
    author_id: string;
    ticker: string;
    resolved_price: number | null;
    bench_resolved_price: number | null;
    benchmark_pct: number | null;
    return_pct: number | null;
    outcome: Outcome;
    resolution_trading_date: string;
    pendingReview?: boolean;
    auditMeta?: Record<string, unknown>;
  };

  const updates: (RowUpdate | null)[] = await Promise.all(
    due.map(async (p) => {
      const meta = await getTickerMeta(p.ticker);
      const horizonDate = p.target_horizon_date ?? p.resolves_at.slice(0, 10);
      const { tradingDate, substituted } = effectiveResolutionDate(horizonDate, meta.timezone);

      // Delisted/acquired: resolve neutral immediately, exclude from MOAT later.
      if (meta.status !== "active") {
        affected.add(p.author_id);
        neutralResolved++;
        return {
          id: p.id,
          report_id: p.report_id,
          author_id: p.author_id,
          ticker: p.ticker,
          resolved_price: p.lock_price,
          bench_resolved_price: p.bench_lock_price,
          benchmark_pct: null,
          return_pct: 0,
          outcome: "neutral" as const,
          resolution_trading_date: tradingDate,
          auditMeta: { reason: "ticker_inactive", ticker_status: meta.status },
        };
      }

      const quote = quotes.get(p.ticker.toUpperCase());
      if (!quote) {
        pendingReview++;
        return {
          id: p.id,
          report_id: p.report_id,
          author_id: p.author_id,
          ticker: p.ticker,
          resolved_price: null,
          bench_resolved_price: null,
          benchmark_pct: null,
          return_pct: null,
          outcome: "open" as const,
          resolution_trading_date: tradingDate,
          pendingReview: true,
          auditMeta: { reason: "no_market_data", target_horizon_date: horizonDate },
        };
      }

      const benchResolved = spy?.price ?? null;
      const benchPct =
        p.bench_lock_price && benchResolved
          ? benchmarkReturn(p.bench_lock_price, benchResolved)
          : null;
      const returnPct = callReturn(p.direction, p.lock_price, quote.price);
      const outcome = gradeOutcome({
        direction: p.direction,
        lock_price: p.lock_price,
        target_price: p.target_price,
        resolved_price: quote.price,
      });

      affected.add(p.author_id);
      return {
        id: p.id,
        report_id: p.report_id,
        author_id: p.author_id,
        ticker: p.ticker,
        resolved_price: quote.price,
        bench_resolved_price: benchResolved,
        benchmark_pct: benchPct,
        return_pct: returnPct,
        outcome,
        resolution_trading_date: tradingDate,
        auditMeta: substituted
          ? { horizon_substituted: true, target_horizon_date: horizonDate, resolution_trading_date: tradingDate }
          : { target_horizon_date: horizonDate, resolution_trading_date: tradingDate },
      };
    }),
  );

  for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK).filter(Boolean) as RowUpdate[];
    await Promise.all(
      chunk.map(async (row) => {
        if (row.pendingReview) {
          await db.from("reports").update({ status: "resolution_pending_review" }).eq("id", row.report_id);
          await logAudit(db, row.author_id, "report.resolution_pending", "report", row.report_id, row.auditMeta ?? {});
          return;
        }

        await db
          .from("predictions")
          .update({
            resolved_price: row.resolved_price,
            bench_resolved_price: row.bench_resolved_price,
            benchmark_pct: row.benchmark_pct,
            return_pct: row.return_pct,
            outcome: row.outcome,
            resolution_trading_date: row.resolution_trading_date,
          })
          .eq("id", row.id);

        if (row.auditMeta) {
          await logAudit(db, row.author_id, "report.resolved", "prediction", row.id, row.auditMeta);
        }
      }),
    );
  }

  // Build a platform-wide alpha distribution so each analyst's excess return is
  // percentile-ranked against everyone else, not squeezed into a fixed +/-20%
  // band (see computeScore's `globalAlphaDistribution` param). Reuses each
  // affected analyst's own predictions (computed fresh below) plus every other
  // analyst's already-persisted avg_alpha, which is far cheaper than re-fetching
  // every analyst's full prediction history on every grading pass.
  const preliminary = new Map<string, ScoreResult>();
  for (const authorId of affected) {
    const { data: rows } = await db
      .from("predictions")
      .select("*")
      .eq("author_id", authorId)
      .limit(1000);
    preliminary.set(authorId, computeScore((rows as Prediction[]) ?? []));
  }

  const { data: allAlphas } = await db.from("profiles").select("id, avg_alpha").not("avg_alpha", "is", null);

  const globalAlphaDistribution = [
    ...[...preliminary.values()].map((r) => r.avgAlpha).filter((v): v is number => v != null),
    ...((allAlphas as { id: string; avg_alpha: number | null }[]) ?? [])
      .filter((r) => !affected.has(r.id))
      .map((r) => r.avg_alpha)
      .filter((v): v is number => v != null),
  ];

  for (const authorId of affected) {
    const { data: rows } = await db
      .from("predictions")
      .select("*")
      .eq("author_id", authorId)
      .limit(1000);
    const preds = (rows as Prediction[]) ?? [];
    const result = computeScore(preds, globalAlphaDistribution);
    const tier = computeTier(result.score, result.total);
    await db
      .from("profiles")
      .update({
        score: result.score,
        rating: result.rating,
        tier: tier.key,
        wilson_win_rate: result.wilsonWinRate,
        profit_factor: result.profitFactor,
        avg_return: result.avgReturn,
        avg_alpha: result.avgAlpha,
        sample_size: result.total,
      })
      .eq("id", authorId);

    await db.from("moat_score_snapshots").insert({
      creator_id: authorId,
      score: result.score,
      sample_size: result.total,
      wilson_win_rate: result.wilsonWinRate,
      profit_factor: result.profitFactor,
      avg_return: result.avgReturn,
      avg_alpha: result.avgAlpha,
      breakdown: result.breakdown,
    });
  }

  const graded = updates.filter((u) => u && !u.pendingReview && u.outcome !== "open").length;

  return {
    graded,
    analystsUpdated: affected.size,
    subscriptionsExpired,
    pendingReview,
    neutralResolved,
  };
}
