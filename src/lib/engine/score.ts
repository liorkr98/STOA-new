/**
 * Engine scoring surface.
 *
 * The scoring math itself lives in ONE place: ./scoring/formula.ts. This module
 * re-exports that formula and adds the grading step (gradeOutcome) and the tier
 * mapping (computeTier), which are not part of the score formula. Callers may
 * keep importing from "@/lib/engine/score" — nothing about the public surface
 * changed when the formula moved.
 */

import type { Direction, Outcome } from "@/lib/types";
import {
  FORMULA_VERSION,
  callReturn,
  computeScore,
  outcomeWeight,
  percentileRank,
  scoreToRating,
} from "./scoring/formula";
import type { ScoreResult, ScoringCall } from "./scoring/formula";

export {
  FORMULA_VERSION,
  callReturn,
  computeScore,
  outcomeWeight,
  percentileRank,
  scoreToRating,
};
export type { ScoreResult, ScoringCall };

/**
 * Grade a single resolved prediction into an outcome. This is the grading step
 * (prices -> hit/near/partial/miss), not the score formula. The formula then
 * consumes the resulting outcome as one of its inputs.
 *
 * Hit: moved with the call and reached/exceeded target (or +5% if no target).
 * Near: moved with the call but fell short of target.
 * Partial: roughly flat (within +/-1.5%).
 * Miss: moved against the call.
 */
export function gradeOutcome(p: {
  direction: Direction;
  lock_price: number;
  target_price: number | null;
  resolved_price: number;
}): Outcome {
  const ret = callReturn(p.direction, p.lock_price, p.resolved_price);
  if (p.direction === "hold") {
    const drift = Math.abs((p.resolved_price - p.lock_price) / p.lock_price) * 100;
    return drift <= 3 ? "hit" : drift <= 6 ? "near" : "miss";
  }
  if (ret === null) return "open";
  if (ret <= -1.5) return "miss";
  if (Math.abs(ret) < 1.5) return "partial";

  if (p.target_price) {
    const reached =
      p.direction === "long"
        ? p.resolved_price >= p.target_price
        : p.resolved_price <= p.target_price;
    return reached ? "hit" : "near";
  }
  return ret >= 5 ? "hit" : "near";
}

// ── Tiers ───────────────────────────────────────────────────────────────────

export interface TierDef {
  key: string;
  label: string;
  minScore: number;
  minCalls: number;
  description: string;
}

export const TIERS: TierDef[] = [
  { key: "legend", label: "Legend", minScore: 80, minCalls: 75, description: "Elite performance across a large verified sample." },
  { key: "elite", label: "Elite", minScore: 65, minCalls: 30, description: "Proven edge: strong win rate and positive profit factor." },
  { key: "expert", label: "Expert", minScore: 50, minCalls: 15, description: "Consistent edge with a meaningful sample." },
  { key: "strong", label: "Strong", minScore: 35, minCalls: 8, description: "Above-average win rate and risk/reward forming." },
  { key: "rising", label: "Rising", minScore: 0, minCalls: 5, description: "Building a track record." },
];

export const BUILDING: TierDef = {
  key: "building",
  label: "Building",
  minScore: 0,
  minCalls: 0,
  description: "Complete 5 resolved calls to earn a tier.",
};

export function computeTier(score: number, totalCalls: number): TierDef {
  for (const t of TIERS) {
    if (score >= t.minScore && totalCalls >= t.minCalls) return t;
  }
  return BUILDING;
}

export function tierProgress(score: number, totalCalls: number) {
  const current = computeTier(score, totalCalls);
  const idx = TIERS.findIndex((t) => t.key === current.key);
  const next = idx > 0 ? TIERS[idx - 1] : null;
  if (!next) return { current, next: null as TierDef | null, requirements: [] };
  return {
    current,
    next,
    requirements: [
      { label: "Analyst score", current: score, required: next.minScore, met: score >= next.minScore },
      { label: "Resolved calls", current: totalCalls, required: next.minCalls, met: totalCalls >= next.minCalls },
    ],
  };
}
