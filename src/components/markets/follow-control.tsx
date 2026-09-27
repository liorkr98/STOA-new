"use client";

import { cn } from "@/lib/design/cn";
import { useSectorWatchlist, useWatchlist } from "@/lib/watchlist";

const pill =
  "tap-target focus-ring inline-flex shrink-0 items-center rounded-chip border px-2.5 py-1 text-ticker font-semibold transition-colors duration-[var(--dur-1)]";

/**
 * Follow as a text pill rather than a star. Reads the same browser-local
 * watchlist the existing star button writes, so the two stay in sync; a
 * server-side follow arrives with the `watchlists` table.
 */
export function FollowTicker({ ticker, className }: { ticker: string; className?: string }) {
  const { ready, toggle, has } = useWatchlist();
  const following = ready && has(ticker);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(ticker);
      }}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${ticker}` : `Follow ${ticker}`}
      className={cn(
        pill,
        following
          ? "border-border-strong bg-surface text-text"
          : "border-coral text-coral hover:bg-[var(--accent-weak)]",
        className,
      )}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

export function FollowSector({ sector, className }: { sector: string; className?: string }) {
  const { ready, toggle, has } = useSectorWatchlist();
  const following = ready && has(sector);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(sector);
      }}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${sector}` : `Follow ${sector}`}
      className={cn(
        pill,
        following
          ? "border-border-strong bg-surface text-text"
          : "border-coral text-coral hover:bg-[var(--accent-weak)]",
        className,
      )}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
