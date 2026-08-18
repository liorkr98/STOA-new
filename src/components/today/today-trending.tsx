"use client";

import { useState } from "react";
import { Rail } from "@/components/ui/rail";
import { TrendingCard } from "@/components/today/today-front";
import type { TodayItem } from "@/lib/today/types";

const MOBILE_COLLAPSED = 5;

/**
 * Trending Now: a numbered list, eight visible on desktop as two rows of four,
 * scrolling horizontally to reach the rest. Velocity, not accumulated
 * popularity. On mobile the list collapses to five with a See more control
 * that expands in place.
 */
export function TodayTrending({ items }: { items: TodayItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const mobileItems = expanded ? items : items.slice(0, MOBILE_COLLAPSED);

  return (
    <>
      {/* Desktop: two rows of four, further columns scroll. */}
      <div className="hidden md:block">
        <Rail
          title="Trending now"
          note="Gaining fastest today"
          trackClassName="grid grid-flow-col grid-rows-2 gap-x-6 gap-y-7 auto-cols-[calc((100%-4.5rem)/4)]"
        >
          {items.map((it, i) => (
            <TrendingCard key={it.reportId} item={it} index={i} />
          ))}
        </Rail>
      </div>

      {/* Mobile: five, then See more. */}
      <section aria-label="Trending now" className="rail md:hidden">
        <div className="rail-head">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="rail-title">Trending now</h2>
            <p className="rail-note">Gaining fastest today</p>
          </div>
        </div>
        <ol className="mt-5 flex flex-col gap-6">
          {mobileItems.map((it, i) => (
            <li key={it.reportId}>
              <TrendingCard item={it} index={i} />
            </li>
          ))}
        </ol>
        {items.length > MOBILE_COLLAPSED && !expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="focus-ring num mt-5 w-full rounded-[var(--radius-btn)] border border-border py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] text-text-mute"
          >
            See more · {items.length - MOBILE_COLLAPSED}
          </button>
        ) : null}
      </section>
    </>
  );
}
