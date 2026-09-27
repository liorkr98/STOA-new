import type { AccessType, ContentType, Direction } from "@/lib/types";
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
  /** The analyst's own one-word beat ("Semiconductors"), when they set one. */
  specialty?: string | null;
}

/** A video's real thumbnail and duration, from `video_clips`. */
export interface TodayThumb {
  thumbnailUrl: string | null;
  durationSeconds: number;
  /** The clip exists but is still being prepared: the frame shows that, not a poster. */
  processing?: boolean;
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

export interface TodayTicker {
  symbol: string;
  company: string | null;
  price: number | null;
  changePercent?: number | null;
  publicationsToday: number;
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
  /**
   * The reader already follows or is a member of this analyst (or is this
   * analyst). A followed row shows no control; the absence is the signal.
   */
  followed: boolean;
}

/** A ticker row in the sidebar: chip, price, day-change slot. */
export interface TodayTickerRow {
  symbol: string;
  price: number | null;
  /** Null when the provider did not carry it; the slot stays reserved. */
  changePercent: number | null;
  publications: number;
}

export interface TodaySidebarPayload {
  trendingCreators: TodayCreatorRow[];
  popularCreators: TodayCreatorRow[];
  trendingTickers: TodayTickerRow[];
  popularTickers: TodayTickerRow[];
  memberships: TodayCreatorRow[];
  following: TodayCreatorRow[];
  signedIn: boolean;
}

/** A Your Desk card: the item plus how the reader knows the analyst. */
export interface TodayDeskItem extends TodayItem {
  relationship: "member" | "following";
}

/** A face in the row of people posting: who, their beat, and when they last posted. */
export interface TodayFace extends TodayAnalyst {
  /** Their newest publication in the window, for the ring: newer than the last piece the reader watched them through to. */
  lastPublishedAt: string;
}

/**
 * The front page, top to bottom: the lead, the faces of the people posting,
 * four clips worth a minute, then the reader's desk, the lead's theme, the
 * written pieces and the wire. Every list is already cut to its slot and may
 * be empty; an empty band is not drawn.
 */
export interface TodayPagePayload {
  /** The New York calendar day the page is for. */
  dateISO: string;
  /** Publications in the last 24 hours, for the dateline. */
  publishedToday: number;
  personalized: boolean;
  /** The day's strongest publication, whatever its form. */
  lead: TodayItem | null;
  /**
   * Analysts who posted in the last 24 hours, newest first. On a quiet day,
   * when nobody has, the most recent posters instead, and `today` is false so
   * the heading does not claim today.
   */
  faces: { today: boolean; people: TodayFace[] };
  /** Up to four publications with a ready clip. */
  minute: TodayItem[];
  desk: TodayDeskItem[];
  /** More on the lead's ticker, sector or theme; null when nothing shares it. */
  cluster: { label: string; items: TodayItem[] } | null;
  /** Written pieces, ranked. */
  reading: TodayItem[];
  news: NewsItem[];
  sidebar: TodaySidebarPayload;
}
