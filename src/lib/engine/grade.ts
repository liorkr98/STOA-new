import type { SupabaseClient } from "@supabase/supabase-js";
import type { Prediction } from "@/lib/types";
import { callReturn, computeScore, computeTier, gradeOutcome, type ScoreResult } from "./score";
import { benchmarkReturn, getQuotesBatch } from "./market";
import { expireSubscriptions } from "./subscriptions";

export interface GradeSummary {
  graded: number;
  analystsUpdated: number;
  subscriptionsExpired: number;
}

const BENCHMARK = "SPY";
const UPDATE_CHUNK = 25;

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

  const due = (data as Prediction[]) ?? [];
  if (due.length === 0) {
    return { graded: 0, analystsUpdated: 0, subscriptionsExpired };
  }

  const quotes = await getQuotesBatch(due.map((p) => p.ticker));
  const spy = quotes.get(BENCHMARK);
  const affected = new Set<string>();

  const updates = due.map((p) => {
    const quote = quotes.get(p.ticker.toUpperCase());
    if (!quote) return null;

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
      resolved_price: quote.price,
      bench_resolved_price: benchResolved,
      benchmark_pct: benchPct,
      return_pct: returnPct,
      outcome,
    };
  });

  for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK).filter(Boolean) as NonNullable<
      (typeof updates)[number]
    >[];
    await Promise.all(
      chunk.map((row) =>
        db
          .from("predictions")
          .update({
            resolved_price: row.resolved_price,
            bench_resolved_price: row.bench_resolved_price,
            benchmark_pct: row.benchmark_pct,
            return_pct: row.return_pct,
            outcome: row.outcome,
          })
          .eq("id", row.id),
      ),
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
  }

  return {
    graded: due.length,
    analystsUpdated: affected.size,
    subscriptionsExpired,
  };
}
