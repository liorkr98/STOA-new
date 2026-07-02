import type { Prediction } from "@/lib/types";
import { computeScore, computeTier, type ScoreResult, type TierDef } from "./score";

export interface AnalystStats extends ScoreResult {
  tier: TierDef;
  resolved: number;
  /** Running MOAT score (0-100) after each resolved call, oldest to newest. */
  series: { label: string; score: number }[];
}

/**
 * Full analyst analytics from their predictions. The running series recomputes
 * the score on the cumulative set after each resolved call, so the chart shows
 * how the MOAT score was actually earned.
 */
export function analystStats(predictions: Prediction[]): AnalystStats {
  const result = computeScore(predictions);
  const tier = computeTier(result.score, result.total);

  const resolved = predictions
    .filter((p) => p.outcome !== "open" && p.lock_price && p.resolved_price != null)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));

  const series: { label: string; score: number }[] = [];
  for (let i = 0; i < resolved.length; i++) {
    const slice = resolved.slice(0, i + 1);
    series.push({ label: `#${i + 1}`, score: computeScore(slice).score });
  }

  return { ...result, tier, resolved: result.total, series };
}
