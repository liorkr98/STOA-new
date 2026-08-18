import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreWall } from "@/components/explore/explore-wall";
import { listVideoClipCards } from "@/lib/db/video-clips";
import { clipsToPublications } from "@/lib/feed/build-publications";
import { EXPLORE, filterOptions, filterTiles, sizeTiles } from "@/lib/explore/wall";
import { publicationAttention } from "@/lib/lifecycle/stages";
import { formatDispatchDateline, getCycleWindow } from "@/lib/dispatch/cycle";
import { getSessionUserId } from "@/lib/db/auth";

export const metadata: Metadata = {
  title: "Explore",
  description: "A wall of analyst videos to scan and choose from.",
};

/**
 * Explore is on-demand discovery: a wall of faces the reader scans and picks
 * from, handing off to the Feed player. Sizes come from trending velocity;
 * the wall packs without gaps.
 */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string; sector?: string }>;
}) {
  const { ticker, sector } = await searchParams;
  const [clips, userId] = await Promise.all([listVideoClipCards(EXPLORE.TARGET_TILES * 3), getSessionUserId()]);
  const pubs = await clipsToPublications(clips);
  const attention = new Map(
    clips
      .filter((c) => c.report)
      .map((c) => [
        c.report!.id,
        publicationAttention({ views: c.report!.views ?? 0, likes: c.report!.likes ?? 0, comments: c.report!.comment_count ?? 0 }),
      ]),
  );
  const tiles = sizeTiles(pubs, (p) => ({ since: p.publishedAt, total: attention.get(p.id) ?? 0 })).slice(0, EXPLORE.TARGET_TILES);
  const options = filterOptions(tiles);
  const shown = filterTiles(tiles, { ticker: ticker ?? null, sector: sector ?? null });

  return (
    <Suspense>
      <ExploreWall
        tiles={shown}
        tickers={options.tickers}
        sectors={options.sectors}
        ticker={ticker?.toUpperCase() ?? null}
        sector={sector ?? null}
        dateline={formatDispatchDateline(getCycleWindow().dateIso)}
        canAct={Boolean(userId)}
      />
    </Suspense>
  );
}
