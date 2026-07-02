"use client";

import { Star } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import { useWatchlist } from "@/lib/watchlist";

export function WatchlistButton({ ticker, className }: { ticker: string; className?: string }) {
  const { ready, toggle, has } = useWatchlist();
  const watching = ready && has(ticker);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(ticker);
      }}
      aria-pressed={watching}
      aria-label={watching ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
      className={cn(
        "tap-target focus-ring inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-btn)] transition-colors",
        watching ? "text-[var(--brass)]" : "text-text-faint hover:text-text",
        className,
      )}
    >
      <Star size={17} weight={watching ? "fill" : "regular"} />
    </button>
  );
}
