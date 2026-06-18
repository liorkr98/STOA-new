import type { SupabaseClient } from "@supabase/supabase-js";
import type { Prediction } from "@/lib/types";
import { callReturn, computeScore, computeTier, gradeOutcome } from "./score";
import { benchmarkReturn, getQuotesBatch } from "./market";
import { expireSubscriptions } from "./subscriptions";

export interface GradeSummary {
  graded: number;
  analystsUpdated: number;
  subscriptionsExpired: number;
}

const BENCHMARK = "SPY";
const UPDATE_CHUNK = 25;

function assertNoError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
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

  const due = (data as Prediction[]) ?? [];
  if (due.length === 0) {
    return { graded: 0, analystsUpdated: 0, subscriptionsExpired };
  }

  const quotes = await getQuotesBatch(due.map((p) => p.ticker));
  const spy = quotes.get(BENCHMARK);
  const affected = new Set<string>();

  const updates = due.flatMap((p) => {
    const quote = quotes.get(p.ticker.toUpperCase());
    if (!quote) return [];

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
    return [
      {
        id: p.id,
        resolved_price: quote.price,
        bench_resolved_price: benchResolved,
        benchmark_pct: benchPct,
        return_pct: returnPct,
        outcome,
      },
    ];
  });

  let graded = 0;
  for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK);
    const results = await Promise.all(
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
    for (const res of results) {
      assertNoError(res.error, "prediction update");
      graded++;
    }
  }

  for (const authorId of affected) {
    const { data: rows, error: fetchErr } = await db
      .from("predictions")
      .select("*")
      .eq("author_id", authorId)
      .limit(1000);
    assertNoError(fetchErr, "fetch predictions for scoring");

    const preds = (rows as Prediction[]) ?? [];
    const result = computeScore(preds);
    const tier = computeTier(result.score, result.total);
    const { error: profileErr } = await db
      .from("profiles")
      .update({ score: result.score, rating: result.rating, tier: tier.key })
      .eq("id", authorId);
    assertNoError(profileErr, "profile score update");
  }

  return {
    graded,
    analystsUpdated: affected.size,
    subscriptionsExpired,
  };
}
