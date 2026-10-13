/**
 * The Interest Cart: a reader's weekly record of which tickers held their
 * attention. A tap is bull or bear, one tap is one count, and the two sides
 * are counted and shown separately. There is never a net figure.
 */

export type CartDirection = "bull" | "bear";

/** Where a tap was made. Only the site writes taps today. */
export type CartSource = "site" | "extension";

/** One tap, as stored. Mirrors the planned `interest_taps` row. */
export type CartTap = {
  /** Made on the device, so a replayed tap can be recognised and not counted twice. */
  id: string;
  userId: string;
  ticker: string;
  direction: CartDirection;
  source: CartSource;
  /** Extension taps only: the video the ticker was spotted in. */
  videoId: string | null;
  videoChannel: string | null;
  /** Extension taps only: seconds into the video when the reader tapped. */
  videoSeconds: number | null;
  /** UTC. Weeks are worked out from it when read, in local time. */
  createdAt: string;
};

/** What a caller may add to a tap beyond the four required fields. */
export type CartTapContext = {
  /** A tap id chosen in advance (a held tap replays under its own id). */
  id?: string;
  videoId?: string | null;
  videoChannel?: string | null;
  videoSeconds?: number | null;
  /** Only for tests and replays: when the tap happened. */
  at?: Date;
};

/** One ticker in one week. */
export type CartRow = {
  ticker: string;
  bull: number;
  bear: number;
  total: number;
};

export type CartWeek = {
  /** YYYY-MM-DD, the local day the week starts on. */
  weekStart: string;
  /** Sorted by total taps, most first. */
  rows: CartRow[];
  tickers: number;
  taps: number;
};
