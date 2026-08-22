import type { AccessType, ContentType, Direction, Outcome } from "@/lib/types";
import type { NewsItem } from "@/lib/market/types";

/** Byline identity, shared by every band. */
export interface TodayAnalyst {
  /**
   * The analyst's profile id. Carried for the generated placeholder thumbnail,
   * which derives a stable colour from it -- an id survives a rename, a handle
   * does not.
   */
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
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
  /** NEW or TRENDING when the lifecycle model says so; nothing else is ever shown. */
  stageMarker?: StageMarker;
  /** The ticker's sector from the instrument table, for kickers. */
  sector?: string | null;
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

export interface TodayTicker {
  symbol: string;
  company: string | null;
  price: number | null;
  changePercent?: number | null;
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
  worthReading: TodayItem[];
}

/* ------------------------------------------------------------------ *
 * The Today front page (the /home rebuild)
 * ------------------------------------------------------------------ */

export type StageMarker = "NEW" | "TRENDING" | null;

/** A creator row in the sidebar: avatar and name only, never a number. */
export interface TodayCreatorRow {
  /** profiles.id, needed to follow from the row. */
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  marker: StageMarker;
  /** Offered to fill an empty list; never presented as an existing relationship. */
  suggestion?: boolean;
}

/** A ticker row in the sidebar: chip, price, day-change slot. */
export interface TodayTickerRow {
  symbol: string;
  price: number | null;
  /** Null when the provider did not carry it; the slot stays reserved. */
  changePercent: number | null;
  publications: number;
  suggestion?: boolean;
}

export interface TodaySidebarPayload {
  trendingCreators: TodayCreatorRow[];
  popularCreators: TodayCreatorRow[];
  trendingTickers: TodayTickerRow[];
  popularTickers: TodayTickerRow[];
  memberships: TodayCreatorRow[];
  following: TodayCreatorRow[];
  /** Fill for short Memberships / Following lists. */
  suggestedCreators: TodayCreatorRow[];
  /** Fill for a short Your Tickers list. */
  suggestedTickers: TodayTickerRow[];
  signedIn: boolean;
}

/** A Your Desk card: the item plus how the reader knows the analyst. */
export interface TodayDeskItem extends TodayItem {
  relationship: "member" | "following";
}

export interface TodayThemeCluster {
  slug: string;
  name: string;
  publicationsThisWeek: number;
  items: TodayItem[];
}

export interface TodayPagePayload {
  issue: { issueNumber: number; dateISO: string };
  personalized: boolean;
  lead: TodayItem | null;
  secondary: TodayItem[];
  trending: TodayItem[];
  desk: TodayDeskItem[];
  verdicts: TodayVerdict[];
  theme: TodayThemeCluster | null;
  news: NewsItem[];
  sidebar: TodaySidebarPayload;
}
