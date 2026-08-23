import { EXPLORE_WEIGHTS, FEED_WEIGHTS, RANKING } from "./weights";
import type { RankingSignals, RankingSurface, ScoreBreakdown, ViewerContext } from "./types";

const DAY_MS = 86_400_000;

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/**
 * Completions as a percentage of plays, not seconds watched. A 30s clip
 * watched to 80% outranks a 60s clip watched to 40%, matching TikTok's
 * length-normalized completion.
 */
export function bayesRate(successes: number, trials: number): number {
  const s = Math.max(0, successes);
  const n = Math.max(0, trials);
  const { BAYES_PRIOR: p, BAYES_STRENGTH: k } = RANKING;
  return (s + p * k) / (n + k);
}

export function recencyScore(publishedAt: string, now: number): number {
  const ageDays = Math.max(0, (now - Date.parse(publishedAt)) / DAY_MS);
  if (!Number.isFinite(ageDays)) return 0;
  return Math.exp(-ageDays / RANKING.RECENCY_DAYS);
}

export function ageDays(publishedAt: string, now: number): number {
  const age = (now - Date.parse(publishedAt)) / DAY_MS;
  return Number.isFinite(age) ? Math.max(0, age) : 0;
}

/** Engagement per day, squashed to 0-1. Absolute view counts never enter. */
export function velocityScore(signals: RankingSignals, now: number): number {
  const days = Math.max(ageDays(signals.publishedAt, now), 0.25);
  const raw = (signals.likes + signals.comments * 2) / days;
  return 1 - Math.exp(-raw / 8);
}

export function topicMatch(signals: RankingSignals, ctx: ViewerContext): number {
  if (signals.ticker && ctx.watchlistTickers.has(signals.ticker.toUpperCase())) return 1;
  const sector = signals.sector?.toLowerCase() ?? "";
  if (sector && ctx.sectorInterests.has(sector)) return 0.75;
  for (const tag of signals.tags) {
    if (tag && ctx.sectorInterests.has(tag.toLowerCase())) return 0.5;
  }
  return 0;
}

/**
 * Explore's conversion proxy: will this viewer follow the analyst?
 * Already-followed analysts are downranked; the surface's job is new follows.
 */
export function followProxy(signals: RankingSignals, ctx: ViewerContext): number {
  const topic = topicMatch(signals, ctx);
  const engagement = bayesRate(signals.likes + signals.comments, Math.max(signals.views, signals.likes, signals.comments));
  if (ctx.followedAnalystIds.has(signals.analystId)) {
    return clamp01(0.15 * topic + 0.1 * engagement);
  }
  return clamp01(0.45 + 0.4 * topic + 0.15 * clamp01(engagement / 0.3));
}

function outcomeMultiplier(outcome: RankingSignals["outcome"]): number {
  if (outcome === "miss") return RANKING.MISS_PENALTY;
  if (outcome === "near" || outcome === "partial") return RANKING.NEAR_PENALTY;
  return 1;
}

function engagementTrials(views: number, successes: number): number {
  return Math.max(views, successes, 0);
}

function topReasons(parts: Record<string, number>, extra: string[]): string[] {
  const ranked = Object.entries(parts)
    .filter(([, v]) => v >= 0.08)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const out: string[] = [];
  for (const r of extra) if (!out.includes(r)) out.push(r);
  for (const r of ranked) if (!out.includes(r)) out.push(r);
  return out.slice(0, 4);
}

export function scoreFeed(signals: RankingSignals, ctx: ViewerContext): ScoreBreakdown {
  const w = FEED_WEIGHTS;
  const likes = bayesRate(signals.likes, engagementTrials(signals.views, signals.likes));
  const comments = bayesRate(signals.comments, engagementTrials(signals.views, signals.comments));
  const completion = bayesRate(signals.completionCount, signals.playCount);
  const clickThrough = bayesRate(signals.clickThroughCount, signals.playCount);
  const watchlist = signals.ticker && ctx.watchlistTickers.has(signals.ticker.toUpperCase()) ? 1 : 0;
  const recency = recencyScore(signals.publishedAt, ctx.now);
  const saves = bayesRate(signals.saveCount, engagementTrials(signals.views, signals.saveCount));
  const shares = bayesRate(signals.shareCount, engagementTrials(signals.views, signals.shareCount));
  const sector = signals.sector && ctx.sectorInterests.has(signals.sector.toLowerCase()) ? 1 : 0;
  const moat = clamp01(signals.moatScore / 100);

  const parts = {
    completion: w.completion * completion,
    likes: w.likes * likes,
    comments: w.comments * comments,
    clickThrough: w.clickThrough * clickThrough,
    watchlist: w.watchlist * watchlist,
    recency: w.recency * recency,
    saves: w.saves * saves,
    shares: w.shares * shares,
    sector: w.sector * sector,
    moat: w.moat * moat,
  };

  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  const reasons: string[] = [];
  if (watchlist) reasons.push("watchlist");
  if (sector > 0 && !watchlist) reasons.push("sector");
  if (moat >= 0.7) reasons.push("high_moat");
  if (recency > 0.75) reasons.push("fresh");

  return {
    score: raw * outcomeMultiplier(signals.outcome),
    reasons: topReasons(parts, reasons),
    parts,
  };
}

export function scoreExplore(signals: RankingSignals, ctx: ViewerContext): ScoreBreakdown {
  const w = EXPLORE_WEIGHTS;
  const likes = bayesRate(signals.likes, engagementTrials(signals.views, signals.likes));
  const comments = bayesRate(signals.comments, engagementTrials(signals.views, signals.comments));
  const clickThrough = bayesRate(signals.clickThroughCount, signals.playCount);
  const recency = recencyScore(signals.publishedAt, ctx.now);
  const saves = bayesRate(signals.saveCount, engagementTrials(signals.views, signals.saveCount));
  const moat = clamp01(signals.moatScore / 100);
  const topic = topicMatch(signals, ctx);
  const follow = followProxy(signals, ctx);
  const velocity = velocityScore(signals, ctx.now);

  const parts = {
    followProxy: w.followProxy * follow,
    likes: w.likes * likes,
    comments: w.comments * comments,
    velocity: w.velocity * velocity,
    topicMatch: w.topicMatch * topic,
    clickThrough: w.clickThrough * clickThrough,
    recency: w.recency * recency,
    moat: w.moat * moat,
    saves: w.saves * saves,
  };

  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  const reasons: string[] = [];
  if (!ctx.followedAnalystIds.has(signals.analystId)) reasons.push("discover");
  if (topic >= 0.75) reasons.push("topic");
  if (moat >= 0.7) reasons.push("high_moat");
  if (velocity > 0.5) reasons.push("velocity");

  return {
    score: raw * outcomeMultiplier(signals.outcome),
    reasons: topReasons(parts, reasons),
    parts,
  };
}

export function scoreItem(signals: RankingSignals, ctx: ViewerContext, surface: RankingSurface): ScoreBreakdown {
  return surface === "explore" ? scoreExplore(signals, ctx) : scoreFeed(signals, ctx);
}
