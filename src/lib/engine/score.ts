/**
 * Stoa Scoring Engine (TypeScript port + Elo blend).
 *
 * A 0-100 analyst score built from four honest, defensible pillars, then mapped
 * onto a 600-1400 Elo-style rating for display.
 *
 *   1. Win Rate      - Wilson lower bound, penalises tiny samples honestly.
 *   2. Profit Factor - avg_win / avg_loss, captures reward/risk edge.
 *   3. Alpha         - average excess return vs the S&P benchmark.
 *   4. Sample ramp   - logarithmic confidence ramp on the composite.
 *
 * Why not raw Elo alone: Elo assumes a zero-sum opponent and a 50% baseline,
 * which ignores market regime (a bull market inflates every long). We score the
 * real distribution of outcomes, then express it on the Elo scale people expect.
 */

import type { Direction, Outcome, Prediction } from "@/lib/types";

const Z = 1.645; // 90% confidence

function wilsonLower(hits: number, total: number): number {
  if (total === 0) return 0;
  const p = hits / total;
  const denom = 1 + (Z * Z) / total;
  const centre = p + (Z * Z) / (2 * total);
  const margin = Z * Math.sqrt((p * (1 - p)) / total + (Z * Z) / (4 * total * total));
  return Math.max(0, (centre - margin) / denom);
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
  return null; // hold contributes accuracy only, not profit factor
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

  // ret > 0: moved the right way. Did it reach target?
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
  };
}

type Resolved = Pick<
  Prediction,
  "direction" | "lock_price" | "resolved_price" | "benchmark_pct" | "outcome"
>;

export function computeScore(predictions: Resolved[]): ScoreResult {
  const resolved = predictions.filter(
    (p) => p.outcome !== "open" && p.lock_price && p.resolved_price != null,
  );
  const total = resolved.length;
  if (total === 0) return nullResult();

  const hits = resolved.filter((p) => p.outcome === "hit" || p.outcome === "near").length;
  const misses = total - hits;
  const winRate = hits / total;
  const wilson = wilsonLower(hits, total);
  const winRateScore = wilson * 100;

  const returns = resolved
    .map((p) => callReturn(p.direction, p.lock_price, p.resolved_price))
    .filter((v): v is number => v !== null);

  const wins = returns.filter((r) => r > 0);
  const losses = returns.filter((r) => r < 0);
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length)
    : null;

  const profitFactor =
    avgLoss != null && avgLoss > 0
      ? Math.min(10, avgWin / avgLoss)
      : wins.length
        ? 5
        : 0;
  const pfScore = Math.min(100, Math.max(0, (profitFactor / 4) * 100));

  const withBench = resolved.filter((p) => p.benchmark_pct != null);
  let avgAlpha: number | null = null;
  let alphaScore: number | null = null;
  if (withBench.length >= 5) {
    const alphas = withBench
      .map((p) => {
        const r = callReturn(p.direction, p.lock_price, p.resolved_price);
        return r !== null ? r - (p.benchmark_pct as number) : null;
      })
      .filter((v): v is number => v !== null);
    if (alphas.length) {
      avgAlpha = alphas.reduce((a, b) => a + b, 0) / alphas.length;
      alphaScore = Math.min(100, Math.max(0, ((avgAlpha + 20) / 40) * 100));
    }
  }

  let composite =
    alphaScore !== null
      ? winRateScore * 0.4 + pfScore * 0.35 + alphaScore * 0.25
      : winRateScore * 0.52 + pfScore * 0.48;

  const sampleScale = Math.min(1, Math.log(1 + total) / Math.log(1 + 75));
  composite = composite * (0.5 + 0.5 * sampleScale);

  const score = Math.round(Math.min(100, Math.max(0, composite)));
  const rating = Math.round(600 + (score / 100) * 800);
  const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null;

  return {
    score,
    rating,
    total,
    hits,
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
    misses: 0,
    winRate: null,
    wilsonWinRate: null,
    profitFactor: null,
    avgReturn: null,
    avgAlpha: null,
    breakdown: { winRate: 0, profitFactor: 0, alpha: null },
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
