export type RankingSurface = "feed" | "explore";

/**
 * Per-item numbers the scorer needs. Rates, not raw counts, go into the
 * weighted sum; this is the denormalized snapshot used to compute those rates.
 */
export interface RankingSignals {
  views: number;
  likes: number;
  comments: number;
  playCount: number;
  completionCount: number;
  clickThroughCount: number;
  saveCount: number;
  shareCount: number;
  publishedAt: string;
  ticker: string | null;
  sector: string | null;
  tags: string[];
  analystId: string;
}

export interface ViewerContext {
  followedAnalystIds: ReadonlySet<string>;
  watchlistTickers: ReadonlySet<string>;
  sectorInterests: ReadonlySet<string>;
  dismissedReportIds: ReadonlySet<string>;
  now: number;
}

export interface ScoreBreakdown {
  score: number;
  reasons: string[];
  parts: Record<string, number>;
}

export interface ScoredClip<T = unknown> {
  item: T;
  analystId: string;
  reportId: string;
  videoId: string;
  score: number;
  reasons: string[];
  parts: Record<string, number>;
}
