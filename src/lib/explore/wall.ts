import { attentionRate, trendingScore, type AttentionSample } from "@/lib/lifecycle/stages";
import type { FeedPublication } from "@/lib/feed/types";
import type { TileSize } from "@/lib/explore/pack";

/**
 * Explore tile sizing. Incoming order is the ranker's order; this function
 * only assigns sizes. The first two slots are spotlight, the next four are
 * medium, the rest standard. TRENDING still marks tiles that have velocity,
 * but it no longer re-sorts the wall.
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

function sizeForIndex(i: number): TileSize {
  if (i < EXPLORE.SPOTLIGHT_COUNT) return "spotlight";
  if (i < EXPLORE.SPOTLIGHT_COUNT + EXPLORE.MEDIUM_COUNT) return "medium";
  return "standard";
}

/** Layout-only: keep the caller's order and stamp sizes by position. */
export function sizeTilesByRank(
  pubs: FeedPublication[],
  sampleFor: (p: FeedPublication) => AttentionSample,
  now = Date.now(),
): ExploreTile[] {
  return pubs.map((p, i) => {
    const trend = trendingScore(sampleFor(p), now);
    return {
      pub: p,
      size: sizeForIndex(i),
      trending: trend > 0 && i < EXPLORE.SPOTLIGHT_COUNT + EXPLORE.MEDIUM_COUNT,
    };
  });
}

/** Dev fixture helper: sort by trending, then size. Live Explore uses sizeTilesByRank. */
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

  return sizeTilesByRank(
    ranked.map((x) => x.p),
    sampleFor,
    now,
  ).map((tile, i) => ({
    ...tile,
    trending: ranked[i]!.trend > 0 && i < EXPLORE.SPOTLIGHT_COUNT + EXPLORE.MEDIUM_COUNT,
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
