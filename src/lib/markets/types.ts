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
  /** Momentum: this week against last. Coverage volume only, never stance. */
  publicationsLastWeek: number;
}

export interface CoveredRow extends MarketRow {
  newPublications: number;
  analystCount: number;
  /** Coverage volume, not a stance: how many calls on this name are still open. */
  openCalls: number;
}

export interface NewlyCalledRow extends MarketRow {
  analyst: {
    handle: string;
    displayName: string;
    avatarUrl: string | null;
  };
  direction: Direction;
  calledAt: string;
  reportId: string;
}

export interface SectorTile {
  name: string;
  publications: number;
}

export interface TapeQuote {
  label: string;
  symbol: string;
  /** Where a click lands: an instrument page, or null when the symbol has none. */
  href: string | null;
  value: number | null;
  changePercent: number | null;
}

export interface EtfBandRow {
  symbol: string;
  name: string;
  publications: number;
  /** Live day change from the batch quote path; null if the provider had none. */
  changePercent: number | null;
}

export interface ExplorePayload {
  tape: TapeQuote[];
  themes: ThemeCard[];
  covered: CoveredRow[];
  newlyCalled: NewlyCalledRow[];
  sectors: SectorTile[];
  uncovered: MarketRow[];
  etfs: EtfBandRow[];
}
