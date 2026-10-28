/**
 * What the detection endpoint returns for one ticker in one video. Mirrors
 * `VideoTicker` in the app (src/lib/extension/types.ts); keep the two in step.
 */
export type VideoTicker = {
  ticker: string;
  name: string;
  /** A few words on what the company is. */
  what: string | null;
  etf: boolean;
  /** "card" pops up beside the video; "line" only joins the In this video line. */
  kind: "card" | "line";
  /** Seconds into the video: the stretch the card belongs to. */
  start: number;
  end: number;
  stance: "bull" | "bear" | null;
  conditional: boolean;
};

export type Direction = "bull" | "bear";

/** This week's counts for one ticker. Never a net figure. */
export type WeekRow = { ticker: string; bull: number; bear: number };

/** A tap as the extension keeps it until the site has it. */
export type LocalTap = {
  id: string;
  ticker: string;
  direction: Direction;
  videoId: string | null;
  videoChannel: string | null;
  videoSeconds: number | null;
  /** The video's title as the page showed it at the tap. */
  videoTitle?: string | null;
  at: string;
  /** Who it was saved for; null while signed out. */
  userId: string | null;
  /** held: signed out. sent: Stoa accepted it. delivered: in the cart on Stoa. */
  status: "held" | "sent" | "delivered";
  undone: boolean;
  /** An undo on a delivered tap, once the site has applied it to the cart. */
  undoDelivered?: boolean;
};

/** The card's line and the More info panel. Mirrors `TickerInfo` in src/lib/extension/ticker-info.ts. */
export type TickerInfo = {
  symbol: string;
  name: string;
  industry: string | null;
  etf: boolean;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  pe: number | null;
  low52: number | null;
  high52: number | null;
  nextEarnings: string | null;
  description: string | null;
  closes: number[];
  analysts: number;
};

/** The extension's own session on Stoa, handed over by the site. */
export type StoaSession = {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  userId: string;
  email: string | null;
};

/** The cart's current week as the site last reported it. */
export type SiteWeek = { userId: string; weekStart: string; rows: WeekRow[]; syncedAt: string };
