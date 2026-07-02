/**
 * Stoa Scoring Engine v3.
 *
 * Composite 0-100 skill score mapped to a 600-1400 display rating.
 *
 *   1. Win rate      - Wilson lower bound on time-weighted outcomes
 *                      (Hit = 1, Near = 0.5, Partial/Miss = 0)
 *   2. Profit factor - decay-weighted avg win / avg loss
 *   3. Alpha         - excess return vs SPY over the same window
 *   4. Sample ramp   - logarithmic confidence on small samples
 *   5. Penalties     - consecutive-miss streak + outcome drawdown
 */

import type { Direction, Outcome, Prediction } from "@/lib/types";

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
 * so a single outsized call can't permanently swamp the score — the MOAT
 * formula's "normalized_return" step.
 */
export function percentileRank(value: number, distribution: number[]): number {
  if (distribution.length === 0) return 50;
  const below = distribution.filter((v) => v < value).length;
  const equal = distribution.filter((v) => v === value).length;
  return Math.round(((below + 0.5 * equal) / distribution.length) * 100);
}

/** Maps 0-100 composite to the public 600-1400 scale. */
export function scoreToRating(score: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return Math.round(600 + (clamped / 100) * 800);
}

/** Ring fill percent from a 600-1400 rating. */
export function ratingToPercent(rating: number): number {
  return Math.min(100, Math.max(0, ((rating - 600) / 800) * 100));
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

/**
 * Grade a single resolved prediction.
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

export interface ScoreResult {
  /** 0-100 composite. */
  score: number;
  /** 600-1400 Elo-style display rating. */
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

type Resolved = Pick<
  Prediction,
  | "direction"
  | "lock_price"
  | "resolved_price"
  | "benchmark_pct"
  | "outcome"
  | "resolves_at"
>;

function streakPenalty(sorted: Resolved[]): number {
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

function drawdownPenalty(sorted: Resolved[]): number {
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

export function computeScore(
  predictions: Resolved[],
  /**
   * Every other creator's avgAlpha, gathered by the caller (grade.ts) across
   * a single grading pass. When supplied, alpha is scored by percentile rank
   * against the platform instead of a fixed linear band — the MOAT formula's
   * normalization step, aligned to real distribution rather than a guessed
   * +/-20% range.
   */
  globalAlphaDistribution?: number[],
): ScoreResult {
  const resolved = predictions
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
