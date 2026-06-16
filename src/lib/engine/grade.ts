import type { SupabaseClient } from "@supabase/supabase-js";
import type { Prediction } from "@/lib/types";
import { callReturn, computeScore, computeTier, gradeOutcome } from "./score";
import { benchmarkReturnSince, getQuote } from "./market";

export interface GradeSummary {
  graded: number;
  analystsUpdated: number;
}

/**
 * Resolves every open prediction whose timeframe has ended, then recomputes the
 * score and tier for each affected analyst. Pass a service-role client so it can
 * write across users. Designed to be idempotent and safe to run on a schedule.
 */
export async function gradeDuePredictions(db: SupabaseClient): Promise<GradeSummary> {
  const nowISO = new Date().toISOString();
  const { data, error } = await db
    .from("predictions")
    .select("*")
    .eq("outcome", "open")
    .lte("resolves_at", nowISO)
    .limit(500);
  if (error) throw new Error(error.message);

  const due = (data as Prediction[]) ?? [];
  const affected = new Set<string>();

  for (const p of due) {
    const quote = await getQuote(p.ticker);
    const benchPct = await benchmarkReturnSince(p.bench_lock_price);
    const returnPct = callReturn(p.direction, p.lock_price, quote.price);
    const outcome = gradeOutcome({
      direction: p.direction,
      lock_price: p.lock_price,
      target_price: p.target_price,
      resolved_price: quote.price,
    });

    await db
      .from("predictions")
      .update({
        resolved_price: quote.price,
        benchmark_pct: benchPct,
        return_pct: returnPct,
        outcome,
      })
      .eq("id", p.id);

    affected.add(p.author_id);
  }

  for (const authorId of affected) {
    const { data: rows } = await db
      .from("predictions")
      .select("*")
      .eq("author_id", authorId)
      .limit(1000);
    const preds = (rows as Prediction[]) ?? [];
    const result = computeScore(preds);
    const tier = computeTier(result.score, result.total);
    await db.from("profiles").update({ score: result.score, tier: tier.key }).eq("id", authorId);
  }

  return { graded: due.length, analystsUpdated: affected.size };
}
