import { buildExplore } from "@/lib/markets/build-explore";
import {
  ExploreCovered,
  ExploreEtfs,
  ExploreMovement,
  ExploreNewlyCalled,
  ExploreSectors,
  ExploreThemes,
  ExploreUncovered,
  MarketTape,
} from "@/components/markets/explore-bands";
import { MarketTapeFallback } from "@/components/markets/market-tape-slot";

/**
 * Markets bands, streamed so the page shell (title, search) can flush before
 * Yahoo and coverage RPCs finish. Warm visits hit the 20s shared cache.
 */
export async function ExploreSlot() {
  const explore = await buildExplore();
  return (
    <>
      <MarketTape quotes={explore.tape} />
      <ExploreThemes themes={explore.themes} />
      <ExploreCovered rows={explore.covered} />
      <ExploreNewlyCalled rows={explore.newlyCalled} />
      <ExploreMovement />
      <ExploreSectors sectors={explore.sectors} />
      <ExploreEtfs rows={explore.etfs} />
      <ExploreUncovered rows={explore.uncovered} />
    </>
  );
}

export function ExploreFallback() {
  return (
    <>
      <MarketTapeFallback />
      <div className="min-h-[32rem]" aria-hidden />
    </>
  );
}
