import { attentionRate, trendingScore, type AttentionSample } from "@/lib/lifecycle/stages";
import type { FeedPublication } from "@/lib/feed/types";
import type { TileSize } from "@/lib/explore/pack";

/**
 * Explore tile sizing. Sizes follow trending rank: the strongest-trending
 * items get spotlight, the next tier medium, the rest standard. Because
 * trending is velocity, new content can earn a large tile and popularity
 * never compounds into permanent occupancy of the big slots. When nothing is
 * young enough to trend, the wall falls back to attention rate so it never
 * flattens into all-standard tiles. EXPLORE_SIZE_COUNTS: tune here.
 */
export const EXPLORE = {
  SPOTLIGHT_COUNT: 2,
  MEDIUM_COUNT: 4,
  /** How many tiles the wall aims for before packing trims to a clean grid. */
  TARGET_TILES: 30,
} as const;

export interface ExploreTile {
  pub: FeedPublication;
  size: TileSize;
  /** Set when the tile earned its size by trending velocity (shows the TRENDING marker). */
  trending: boolean;
}

export function sizeTiles(
  pubs: FeedPublication[],
  sampleFor: (p: FeedPublication) => AttentionSample,
  now = Date.now(),
): ExploreTile[] {
  const ranked = pubs
    .map((p) => {
      const s = sampleFor(p);
      return { p, trend: trendingScore(s, now), rate: attentionRate(s, now) };
    })
    .sort((a, b) => b.trend - a.trend || b.rate - a.rate);

  return ranked.map((x, i) => ({
    pub: x.p,
    size: i < EXPLORE.SPOTLIGHT_COUNT ? "spotlight" : i < EXPLORE.SPOTLIGHT_COUNT + EXPLORE.MEDIUM_COUNT ? "medium" : "standard",
    trending: x.trend > 0 && i < EXPLORE.SPOTLIGHT_COUNT + EXPLORE.MEDIUM_COUNT,
  }));
}

export interface ExploreFilters {
  ticker: string | null;
  sector: string | null;
}

export function filterTiles(tiles: ExploreTile[], f: ExploreFilters): ExploreTile[] {
  return tiles.filter((t) => {
    if (f.ticker && (t.pub.ticker ?? "").toUpperCase() !== f.ticker.toUpperCase()) return false;
    if (f.sector && (t.pub.sector ?? "").toLowerCase() !== f.sector.toLowerCase()) return false;
    return true;
  });
}

/**
 * The filter choices, ordered most-covered first.
 *
 * Names only. The counts used to be rendered beside each option and are not any
 * more: a number on every row is noise on a page this quiet, and the reader is
 * picking a ticker rather than auditing coverage. They still decide the order,
 * which is the part that was actually useful, so the options worth having are
 * the ones in view before anyone types.
 */
export function filterOptions(tiles: ExploreTile[]): { tickers: string[]; sectors: string[] } {
  const tickers = new Map<string, number>();
  const sectors = new Map<string, number>();
  for (const t of tiles) {
    if (t.pub.ticker) tickers.set(t.pub.ticker, (tickers.get(t.pub.ticker) ?? 0) + 1);
    if (t.pub.sector) sectors.set(t.pub.sector, (sectors.get(t.pub.sector) ?? 0) + 1);
  }
  const byCoverage = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  return { tickers: byCoverage(tickers), sectors: byCoverage(sectors) };
}
