/**
 * Transparent ranking weights. Sum to 1 per surface. Tune here; report the change.
 *
 * Rule 0: engagement decides what gets seen; the ledger (MOAT) is a light
 * amplifier, not the sort key. Likes and comments are first-class, as rates
 * (Bayesian-smoothed, so a 3-view clip with 3 likes does not beat a 200-view
 * clip with 40 likes). Comment *volume* is not a term: that is the controversy
 * loop. Comment *rate* is the conversion-adjacent signal.
 *
 * Feed and Explore are video-only, so there is no format multiplier and no
 * video slot guarantee.
 */

export const RANKING = {
  /** Recency half-life in days: score *= exp(-age / this). */
  RECENCY_DAYS: 7,
  /** Strength of the Bayesian prior so small pools cannot spike a rate. */
  BAYES_STRENGTH: 16,
  /** Neutral rate used when there is no history yet. */
  BAYES_PRIOR: 0.12,
  /** A resolved MISS on this call, not the analyst's whole record. */
  MISS_PENALTY: 0.85,
  NEAR_PENALTY: 0.95,
  MAX_CONSECUTIVE_PER_ANALYST: 2,
  MAX_PER_WINDOW: 4,
  WINDOW_SIZE: 12,
} as const;

export const FEED_WEIGHTS = {
  completion: 0.18,
  likes: 0.16,
  comments: 0.14,
  clickThrough: 0.14,
  watchlist: 0.12,
  recency: 0.1,
  saves: 0.05,
  shares: 0.05,
  sector: 0.03,
  moat: 0.03,
} as const;

export const EXPLORE_WEIGHTS = {
  followProxy: 0.16,
  likes: 0.16,
  comments: 0.16,
  velocity: 0.14,
  topicMatch: 0.12,
  clickThrough: 0.1,
  recency: 0.08,
  moat: 0.04,
  saves: 0.04,
} as const;
