import type { AccessType, ContentType, Direction, Outcome } from "@/lib/types";

/** Byline identity, shared by every band. */
export interface TodayAnalyst {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  score: number | null;
  /** Under 10 resolved calls: ScoreRing shows its brass PROVISIONAL label. */
  provisional: boolean;
}

/** A video's real thumbnail and duration, from `video_clips`. */
export interface TodayThumb {
  thumbnailUrl: string | null;
  durationSeconds: number;
}

/** One headline row: the unit every reading-list band is built from. */
export interface TodayItem {
  reportId: string;
  type: ContentType;
  ticker: string | null;
  direction: Direction | null;
  contentBadge: string[];
  headline: string;
  deck: string | null;
  author: TodayAnalyst;
  publishedAt: string | null;
  access: AccessType;
  price: number | null;
  saved: boolean;
  thumb: TodayThumb | null;
  /**
   * Theme or sector chip for a publication carrying no ticker. Only surfaces
   * that know the theme can set it: on a sector page the sector itself is the
   * tag. Elsewhere it stays null, since the content model has no per-report
   * theme field to read.
   */
  themeTag?: string | null;
}

/** A resolved call, graded by the market. Never paywalled. */
export interface TodayVerdict {
  reportId: string;
  ticker: string;
  direction: Direction;
  outcome: Exclude<Outcome, "open">;
  headline: string;
  entryPrice: number;
  exitPrice: number | null;
  returnPct: number | null;
  resolvedAt: string;
  author: TodayAnalyst;
}

/**
 * Why a saved item is resurfacing. Every reason here is computed from stored
 * data. `price_near_target` from the design brief is deliberately absent: it
 * needs a live quote per saved ticker, which the engine's `Quote` shape does
 * not carry and which would put an external market-data call on the critical
 * path of the signed-in home page.
 */
export type TodaySavedReason = "resolved_hit" | "resolved_miss" | "follow_up" | "unread";

export interface TodaySavedItem extends TodayItem {
  reason: TodaySavedReason;
  savedAt: string;
}

export interface TodayVideo {
  reportId: string;
  videoId: string;
  headline: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  ticker: string | null;
  contentBadge: string[];
  /**
   * Publication views (`reports.views`), not video-player views. True
   * play counts live in `video_view_events`, which RLS exposes only to the
   * clip's own creator, so a reader cannot be shown them.
   */
  publicationViews: number;
  author: TodayAnalyst;
}

export interface TodayStanding {
  rank: number;
  analyst: TodayAnalyst;
  hitRatePct: number | null;
  resolvedCalls: number;
}

export interface TodayTicker {
  symbol: string;
  company: string | null;
  price: number | null;
  publicationsToday: number;
}

export interface TodayPayload {
  desk: {
    subscriptions: TodayItem[];
    following: TodayItem[];
  };
  verdicts: TodayVerdict[];
  saved: TodaySavedItem[];
  mostWatched: TodayVideo[];
  standings: TodayStanding[];
  worthReading: TodayItem[];
}
