import { Suspense } from "react";
import { ExploreWall } from "@/components/explore/explore-wall";
import { fixturePublications, fixtureSample } from "@/lib/dev/feed-fixtures";
import { EXPLORE, filterOptions, filterTiles, sizeTiles } from "@/lib/explore/wall";

/** Dev-only seeded Explore wall (30 fictional publications) with the Feed player. */
export default async function DevExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string; sector?: string }>;
}) {
  const { ticker, sector } = await searchParams;
  const tiles = sizeTiles(fixturePublications(), fixtureSample, Date.parse("2026-08-18T14:00:00Z")).slice(0, EXPLORE.TARGET_TILES);
  const options = filterOptions(tiles);
  const shown = filterTiles(tiles, { ticker: ticker ?? null, sector: sector ?? null });
  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-8">
      <Suspense>
        <ExploreWall
          tiles={shown}
          tickers={options.tickers}
          sectors={options.sectors}
          ticker={ticker?.toUpperCase() ?? null}
          sector={sector ?? null}
          dateline="Tuesday, August 18, 2026"
          basePath="/dev/explore"
        />
      </Suspense>
    </div>
  );
}
