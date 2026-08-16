import type { Direction } from "@/lib/types";

/** A ticker as it appears in any Explore list. */
export interface MarketRow {
  symbol: string;
  company: string;
  price: number | null;
  /** DAY-CHANGE-PENDING: null until the batch quote path carries prev close. */
  changePercent: number | null;
  marketCap: number | null;
}

export interface ThemeCard {
  slug: string;
  name: string;
  deck: string;
  constituents: MarketRow[];
  publicationsThisWeek: number;
}

/** How the open calls on a name lean. Majority side is coloured. */
export interface CallLean {
  long: number;
  short: number;
}

export interface CoveredRow extends MarketRow {
  newPublications: number;
  analystCount: number;
  lean: CallLean;
}

export interface NewlyCalledRow extends MarketRow {
  analyst: {
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    score: number | null;
    provisional: boolean;
  };
  direction: Direction;
  calledAt: string;
  reportId: string;
}

export interface SectorTile {
  name: string;
  publications: number;
  /** DAY-CHANGE-PENDING */
  changePercent: number | null;
}

export interface TapeQuote {
  label: string;
  symbol: string;
  value: number | null;
  /** DAY-CHANGE-PENDING */
  changePercent: number | null;
}

export interface ExplorePayload {
  tape: TapeQuote[];
  themes: ThemeCard[];
  covered: CoveredRow[];
  newlyCalled: NewlyCalledRow[];
  sectors: SectorTile[];
  uncovered: MarketRow[];
}
