"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { FeedCardView } from "@/components/feed/feed-cards";
import type { FeedCard } from "@/lib/feed/types";

/**
 * The publication's evidence cards on the report page. The Feed shows the same
 * deck as a full-bleed 9:16 stage; here it reads as a horizontal strip beside
 * the thesis, so the cards stay skimmable without taking over the page.
 */
export function ReportCards({
  cards,
  ticker,
  className,
}: {
  cards: FeedCard[];
  ticker?: string | null;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  if (cards.length === 0) return null;

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  function nudge(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  }

  return (
    <section className={cn("min-w-0", className)} aria-label="Evidence cards">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="num text-[10px] uppercase tracking-[0.2em] text-text-mute">
          Evidence · {cards.length} card{cards.length === 1 ? "" : "s"}
        </h2>
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label="Previous card"
            className="focus-ring flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] border border-border text-text disabled:opacity-35"
          >
            <ChevronLeft size={14} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Next card"
            className="focus-ring flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] border border-border text-text disabled:opacity-35"
          >
            <ChevronRight size={14} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((c) => (
          <div
            key={c.id}
            className="min-h-[15rem] w-[min(19rem,80vw)] flex-none snap-start sm:min-h-[16rem]"
          >
            <FeedCardView card={c} ticker={ticker} />
          </div>
        ))}
      </div>
    </section>
  );
}
