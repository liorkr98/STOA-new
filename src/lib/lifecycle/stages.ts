/**
 * The lifecycle model: content and creators move through NEW, AVERAGE, RISING,
 * TRENDING and POPULAR. Only NEW and TRENDING are ever shown to users; the rest
 * are invisible mechanics that drive placement (Explore tile sizes, Today's
 * lists, the Feed order).
 *
 * TRENDING is velocity, not accumulated volume: attention per day since the
 * item arrived, measured against the whole population's typical rate. POPULAR
 * is accumulated attention. Every threshold is a named constant so it can be
 * tuned in one place. LIFECYCLE_THRESHOLDS: change here, report the change.
 *
 * Without per-event engagement history, "attention per day since arrival" is
 * the honest velocity proxy; a windowed rate (last 48h vs prior 14d) should
 * replace it once engagement events are recorded. ENGAGEMENT_EVENTS_PLACEHOLDER.
 */

export type LifecycleStage = "new" | "average" | "rising" | "trending" | "popular";

export const LIFECYCLE = {
  /** A publication or creator is NEW for this many days after arriving. */
  NEW_MAX_AGE_DAYS: 30,
  /** ...and, for creators, only while they have fewer than this many publications. */
  NEW_MAX_PUBLICATIONS: 5,
  /** Only items younger than this can be TRENDING; older ones are POPULAR or AVERAGE. */
  TRENDING_MAX_AGE_DAYS: 14,
  /** Attention rate must be at least this multiple of the population median to be TRENDING. */
  TRENDING_MULTIPLE: 2.5,
  /** ...and at least this multiple to be RISING. */
  RISING_MULTIPLE: 1.5,
  /** Below this much accumulated attention nothing counts as trending (noise floor). */
  TRENDING_MIN_ATTENTION: 40,
  /** Accumulated attention at or above this is POPULAR (publications). */
  POPULAR_MIN_ATTENTION: 5_000,
  /** Followers at or above this is POPULAR (creators). */
  POPULAR_MIN_FOLLOWERS: 2_000,
} as const;

const DAY = 86_400_000;

export interface AttentionSample {
  /** ISO timestamp the item arrived (published_at / created_at). */
  since: string;
  /** Accumulated attention: views + weighted likes/comments for publications, followers for creators. */
  total: number;
  /** Creators only: how many publications they have. */
  publications?: number;
}

/** Attention per day since arrival (minimum age one hour so brand-new items are not infinite). */
export function attentionRate(sample: AttentionSample, now = Date.now()): number {
  const ageDays = Math.max(1 / 24, (now - Date.parse(sample.since)) / DAY);
  return sample.total / ageDays;
}

function median(values: number[]): number {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (v.length === 0) return 0;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** The population's typical rate. Compute once per surface, pass to stageFor. */
export function medianRate(samples: AttentionSample[], now = Date.now()): number {
  return median(samples.map((s) => attentionRate(s, now)));
}

export function stageFor(
  sample: AttentionSample,
  kind: "publication" | "creator",
  populationMedianRate: number,
  now = Date.now(),
): LifecycleStage {
  const ageDays = (now - Date.parse(sample.since)) / DAY;
  const rate = attentionRate(sample, now);
  const v = populationMedianRate > 0 ? rate / populationMedianRate : rate > 0 ? Infinity : 0;
  const young = ageDays <= LIFECYCLE.TRENDING_MAX_AGE_DAYS;
  const aboveFloor = sample.total >= LIFECYCLE.TRENDING_MIN_ATTENTION;

  if (young && aboveFloor && v >= LIFECYCLE.TRENDING_MULTIPLE) return "trending";

  const popular =
    kind === "creator"
      ? sample.total >= LIFECYCLE.POPULAR_MIN_FOLLOWERS
      : sample.total >= LIFECYCLE.POPULAR_MIN_ATTENTION;
  if (popular) return "popular";

  const isNew =
    ageDays <= LIFECYCLE.NEW_MAX_AGE_DAYS &&
    (kind === "publication" || (sample.publications ?? 0) < LIFECYCLE.NEW_MAX_PUBLICATIONS);
  if (isNew) return "new";

  if (aboveFloor && v >= LIFECYCLE.RISING_MULTIPLE) return "rising";
  return "average";
}

/** The only two stages a reader ever sees. */
export function visibleStageMarker(stage: LifecycleStage): "NEW" | "TRENDING" | null {
  if (stage === "new") return "NEW";
  if (stage === "trending") return "TRENDING";
  return null;
}

/** Publication attention: views plus weighted likes and comments. */
export function publicationAttention(input: { views: number; likes: number; comments: number }): number {
  return input.views + input.likes * 5 + input.comments * 10;
}

/** Sort key for "trending" lists: rate, restricted to young items. */
export function trendingScore(sample: AttentionSample, now = Date.now()): number {
  const ageDays = (now - Date.parse(sample.since)) / DAY;
  if (ageDays > LIFECYCLE.TRENDING_MAX_AGE_DAYS) return 0;
  return attentionRate(sample, now);
}
