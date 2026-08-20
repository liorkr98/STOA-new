import type { Metadata } from "next";
import { Suspense } from "react";
import { InstrumentSearch } from "@/components/markets/instrument-search";
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
import { buildExplore } from "@/lib/markets/build-explore";
import { TodayNewsSlot } from "@/components/today/today-news-slot";

export const metadata: Metadata = { title: "Markets" };

function dateline(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    })
    .toUpperCase();
}

/**
 * Markets, the Explore view. One page: instrument search plus bands you browse.
 * Deliberately not a screener and not a directory -- a reader should meet names
 * through themes and analyst activity rather than by looking up a symbol they
 * already had in mind. No trade controls anywhere; this is research only.
 */
export default async function MarketsPage() {
  const explore = await buildExplore();

  return (
    <article className="markets-page mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <header>
        <h1 className="markets-title">Markets</h1>
        <p className="markets-dateline">{dateline()}</p>
      </header>

      <InstrumentSearch />

      <MarketTape quotes={explore.tape} />

      <ExploreThemes themes={explore.themes} />
      <ExploreCovered rows={explore.covered} />
      <ExploreNewlyCalled rows={explore.newlyCalled} />
      <ExploreMovement />
      <ExploreSectors sectors={explore.sectors} />
      <ExploreEtfs rows={explore.etfs} />
      <ExploreUncovered rows={explore.uncovered} />
      <Suspense fallback={null}>
        <TodayNewsSlot />
      </Suspense>
    </article>
  );
}
