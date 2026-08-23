import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreWall } from "@/components/explore/explore-wall";
import { listVideoClipCards } from "@/lib/db/video-clips";
import { getSessionUserId } from "@/lib/db/auth";
import { recordRankingImpressions } from "@/lib/db/ranking";
import { clipsToPublications } from "@/lib/feed/build-publications";
import {
  EXPLORE,
  filterOptions,
  filterTiles,
  sizeTilesByRank,
} from "@/lib/explore/wall";
import { publicationAttention } from "@/lib/lifecycle/stages";
import { formatDispatchDateline, getCycleWindow } from "@/lib/dispatch/cycle";
import { loadViewerContext } from "@/lib/ranking/context";
import { rankClips } from "@/lib/ranking/rank";

export const metadata: Metadata = {
  title: "Explore",
  description: "A wall of analyst videos to scan and choose from.",
};

/**
 * Explore is on-demand discovery: a wall of faces the reader scans and picks
 * from, handing off to the Feed player. Order comes from the Explore ranker
 * (likes, comments, follow probability, velocity; MOAT is a light gate). Tile
 * size follows that order; the wall packs without gaps.
 */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string; sector?: string }>;
}) {
  const [{ ticker, sector }, userId, clips, viewer] = await Promise.all([
    searchParams,
    getSessionUserId(),
    listVideoClipCards(EXPLORE.TARGET_TILES * 3),
    loadViewerContext(),
  ]);
  const sessionId = crypto.randomUUID();
  const ranked = await rankClips(clips, viewer, "explore");
  const pubs = await clipsToPublications(ranked.map((r) => r.item));
  const reasonsByReport = new Map(ranked.map((r) => [r.reportId, r.reasons]));
  for (const pub of pubs) pub.rankReasons = reasonsByReport.get(pub.id);

  const attention = new Map(
    ranked
      .filter((r) => r.item.report)
      .map((r) => [
        r.item.report!.id,
        publicationAttention({
          views: r.item.report!.views ?? 0,
          likes: r.item.report!.likes ?? 0,
          comments: r.item.report!.comment_count ?? 0,
        }),
      ]),
  );
  const tiles = sizeTilesByRank(pubs, (p) => ({
    since: p.publishedAt,
    total: attention.get(p.id) ?? 0,
  })).slice(0, EXPLORE.TARGET_TILES);
  const options = filterOptions(tiles);
  const shown = filterTiles(tiles, {
    ticker: ticker ?? null,
    sector: sector ?? null,
  });

  void recordRankingImpressions({
    sessionId,
    userId,
    surface: "explore",
    rows: ranked.slice(0, EXPLORE.TARGET_TILES).map((r, i) => ({
      videoId: r.videoId,
      reportId: r.reportId,
      analystId: r.analystId,
      position: i,
      score: r.score,
      reasons: r.reasons,
    })),
  });

  return (
    <Suspense>
      <div className="mx-auto w-full max-w-[var(--w-wide)]">
        <ExploreWall
          tiles={shown}
          tickers={options.tickers}
          sectors={options.sectors}
          ticker={ticker?.toUpperCase() ?? null}
          sector={sector ?? null}
          dateline={formatDispatchDateline(getCycleWindow().dateIso)}
        />
      </div>
    </Suspense>
  );
}
