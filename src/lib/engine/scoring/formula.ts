/**
 * Track Score formula — the ONE place scoring math lives.
 *
 * Contract:
 *   input  = ScoringCall[]   (the resolved-call facts defined below, nothing else)
 *   output = ScoreResult      (the 0-100 score plus its component parts + the
 *                              version of the formula that produced it)
 *
 * To swap the formula later (e.g. to the modified-Elo model the docs describe),
 * change `computeScore`'s body and bump `FORMULA_VERSION`. Nothing else in the
 * app should do scoring arithmetic of its own, and all stored scores get
 * recomputed together (see `scripts/recompute-scores.ts` and the "Swapping the
 * formula" section of docs/PRODUCT_MODEL.md).
 *
 * Current formula (composite-v3) — unchanged from the shipped engine:
 *   1. Win rate      - Wilson lower bound on time-weighted outcomes
 *                      (Hit = 1, Near = 0.5, Partial/Miss = 0)
 *   2. Profit factor - decay-weighted avg win / avg loss
 *   3. Alpha         - excess return vs SPY over the same window
 *   4. Sample ramp   - logarithmic confidence on small samples
 *   5. Penalties     - consecutive-miss streak + outcome drawdown
 */

import type { Direction, Outcome, Prediction } from "@/lib/types";

/**
 * Identifier of the formula that produced a score. Bump this on ANY change to
 * the scoring math so every stored score stays traceable to how it was made.
 */
export const FORMULA_VERSION = "composite-v3";

/**
 * The resolved-call facts the formula consumes. The score is derived only from
 * these fields; the formula reads nothing else about a call.
 */
export type ScoringCall = Pick<
  Prediction,
  "direction" | "lock_price" | "resolved_price" | "benchmark_pct" | "outcome" | "resolves_at"
>;

export interface ScoreResult {
  /** The formula version that produced this result (see FORMULA_VERSION). */
  formulaVersion: string;
  /** 0-100 composite. */
  score: number;
  /** 600-1400 Elo-style display rating (stored, no longer displayed). */
  rating: number;
  total: number;
  hits: number;
  nearHits: number;
  misses: number;
  winRate: number | null;
  wilsonWinRate: number | null;
  profitFactor: number | null;
  avgReturn: number | null;
  avgAlpha: number | null;
  breakdown: {
    winRate: number;
    profitFactor: number;
    alpha: number | null;
    consistency: number;
  };
}

const Z = 1.645; // 90% confidence
const DECAY_LAMBDA = 0.003; // ~8-month half-life for recent-call emphasis

function wilsonLower(hits: number, total: number): number {
  if (total <= 0) return 0;
  const p = Math.min(1, Math.max(0, hits / total));
  const denom = 1 + (Z * Z) / total;
  const centre = p + (Z * Z) / (2 * total);
  const margin = Z * Math.sqrt((p * (1 - p)) / total + (Z * Z) / (4 * total * total));
  return Math.max(0, (centre - margin) / denom);
}

/**
 * Percentile rank of `value` within `distribution`, as a 0-100 number.
 * Used to normalize a creator's average alpha against every other creator's,
 * so a single outsized call can't permanently swamp the score.
 */
export function percentileRank(value: number, distribution: number[]): number {
  if (distribution.length === 0) return 50;
  const below = distribution.filter((v) => v < value).length;
  const equal = distribution.filter((v) => v === value).length;
  return Math.round(((below + 0.5 * equal) / distribution.length) * 100);
}

/** Maps 0-100 composite to the legacy 600-1400 scale, stored but no longer displayed. */
export function scoreToRating(score: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return Math.round(600 + (clamped / 100) * 800);
}

/** Direction-aware signed return %, or null if not computable. */
export function callReturn(
  direction: Direction,
  lockPrice: number | null,
  resolvedPrice: number | null,
): number | null {
  if (!lockPrice || !resolvedPrice || lockPrice === 0) return null;
  const raw = (resolvedPrice - lockPrice) / lockPrice;
  if (direction === "long") return raw * 100;
  if (direction === "short") return -raw * 100;
  return null;
}

/** Fractional win credit: Hit = 1, Near = 0.5, Partial/Miss = 0. */
export function outcomeWeight(outcome: Outcome): number {
  if (outcome === "hit") return 1;
  if (outcome === "near") return 0.5;
  return 0;
}

function timeWeight(resolvesAt: string | null | undefined): number {
  if (!resolvesAt) return 1;
  const daysAgo = (Date.now() - new Date(resolvesAt).getTime()) / 86_400_000;
  return Math.exp(-DECAY_LAMBDA * Math.max(0, daysAgo));
}

function streakPenalty(sorted: ScoringCall[]): number {
  let maxStreak = 0;
  let current = 0;
  for (const p of sorted) {
    if (p.outcome === "miss") {
      current++;
      maxStreak = Math.max(maxStreak, current);
    } else {
      current = 0;
    }
  }
  return Math.min(0.1, maxStreak * 0.02);
}

function drawdownPenalty(sorted: ScoringCall[]): number {
  let peak = 0;
  let running = 0;
  let maxDd = 0;
  for (const p of sorted) {
    running += outcomeWeight(p.outcome) - 0.5;
    peak = Math.max(peak, running);
    maxDd = Math.max(maxDd, peak - running);
  }
  return Math.min(0.05, (maxDd / 6) * 0.05);
}

/**
 * The formula. Given a set of resolved calls, returns the 0-100 Track Score and
 * its component parts. Same math as the shipped engine; only its home moved.
 */
export function computeScore(
  calls: ScoringCall[],
  globalAlphaDistribution?: number[],
): ScoreResult {
  const resolved = calls
    .filter((p) => p.outcome !== "open" && p.outcome !== "neutral" && p.lock_price && p.resolved_price != null)
    .sort((a, b) => +new Date(a.resolves_at) - +new Date(b.resolves_at));

  const total = resolved.length;
  if (total === 0) return nullResult();

  const fullHits = resolved.filter((p) => p.outcome === "hit").length;
  const nearHits = resolved.filter((p) => p.outcome === "near").length;
  const misses = resolved.filter((p) => p.outcome === "miss" || p.outcome === "partial").length;

  let weightedHits = 0;
  let weightedTotal = 0;
  for (const p of resolved) {
    const w = timeWeight(p.resolves_at);
    weightedHits += w * outcomeWeight(p.outcome);
    weightedTotal += w;
  }

  const winRate = weightedTotal > 0 ? weightedHits / weightedTotal : 0;
  const wilson = wilsonLower(weightedHits, weightedTotal);
  const winRateScore = wilson * 100;

  let winSum = 0;
  let winWeight = 0;
  let lossSum = 0;
  let lossWeight = 0;
  const returns: number[] = [];

  for (const p of resolved) {
    const w = timeWeight(p.resolves_at);
    const ret = callReturn(p.direction, p.lock_price, p.resolved_price);
    if (ret === null) continue;
    returns.push(ret);
    if (ret > 0) {
      winSum += ret * w;
      winWeight += w;
    } else if (ret < 0) {
      lossSum += Math.abs(ret) * w;
      lossWeight += w;
    }
  }

  const avgWin = winWeight > 0 ? winSum / winWeight : 0;
  const avgLoss = lossWeight > 0 ? lossSum / lossWeight : null;

  const profitFactor =
    avgLoss != null && avgLoss > 0
      ? Math.min(10, avgWin / avgLoss)
      : winWeight > 0
        ? 5
        : 0;
  const pfScore = Math.min(100, Math.max(0, (profitFactor / 4) * 100));

  const withBench = resolved.filter((p) => p.benchmark_pct != null);
  let avgAlpha: number | null = null;
  let alphaScore: number | null = null;
  if (withBench.length >= 5) {
    let alphaSum = 0;
    let alphaWeight = 0;
    for (const p of withBench) {
      const w = timeWeight(p.resolves_at);
      const r = callReturn(p.direction, p.lock_price, p.resolved_price);
      if (r === null) continue;
      alphaSum += (r - (p.benchmark_pct as number)) * w;
      alphaWeight += w;
    }
    if (alphaWeight > 0) {
      avgAlpha = alphaSum / alphaWeight;
      alphaScore =
        globalAlphaDistribution && globalAlphaDistribution.length >= 5
          ? percentileRank(avgAlpha, globalAlphaDistribution)
          : Math.min(100, Math.max(0, ((avgAlpha + 20) / 40) * 100));
    }
  }

  const streak = streakPenalty(resolved);
  const drawdown = drawdownPenalty(resolved);
  const consistencyScore = Math.round((1 - streak - drawdown) * 100);

  let composite =
    alphaScore !== null
      ? winRateScore * 0.35 + pfScore * 0.3 + alphaScore * 0.2 + consistencyScore * 0.15
      : winRateScore * 0.45 + pfScore * 0.4 + consistencyScore * 0.15;

  const sampleScale = Math.min(1, Math.log(1 + total) / Math.log(1 + 75));
  composite = composite * (0.5 + 0.5 * sampleScale);

  const score = Math.round(Math.min(100, Math.max(0, composite)));
  const rating = scoreToRating(score);
  const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null;

  return {
    formulaVersion: FORMULA_VERSION,
    score,
    rating,
    total,
    hits: fullHits,
    nearHits,
    misses,
    winRate,
    wilsonWinRate: wilson,
    profitFactor: round2(profitFactor),
    avgReturn: avgReturn != null ? round2(avgReturn) : null,
    avgAlpha: avgAlpha != null ? round2(avgAlpha) : null,
    breakdown: {
      winRate: Math.round(winRateScore),
      profitFactor: Math.round(pfScore),
      alpha: alphaScore !== null ? Math.round(alphaScore) : null,
      consistency: consistencyScore,
    },
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function nullResult(): ScoreResult {
  return {
    formulaVersion: FORMULA_VERSION,
    score: 0,
    rating: 600,
    total: 0,
    hits: 0,
    nearHits: 0,
    misses: 0,
    winRate: null,
    wilsonWinRate: null,
    profitFactor: null,
    avgReturn: null,
    avgAlpha: null,
    breakdown: { winRate: 0, profitFactor: 0, alpha: null, consistency: 100 },
  };
}
