import type { Metadata } from "next";
import { Suspense } from "react";
import { InstrumentSearch } from "@/components/markets/instrument-search";
import { ExploreFallback, ExploreSlot } from "@/components/markets/explore-slot";
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
  return (
    <article className="markets-page mx-auto w-full max-w-[var(--w-wide)] py-10 sm:py-14">
      <header>
        <h1 className="markets-title">Markets</h1>
        <p className="markets-dateline">{dateline()}</p>
      </header>

      <InstrumentSearch />

      <Suspense fallback={<ExploreFallback />}>
        <ExploreSlot />
      </Suspense>
      <Suspense fallback={null}>
        <TodayNewsSlot />
      </Suspense>
    </article>
  );
}
