import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MoatBadge } from "@/components/ui/moat-badge";
import type { DispatchStory } from "@/lib/dispatch/types";

/**
 * The wire: dense one-line stories below the featured block. Ticker in a
 * fixed mono gutter, serif headline as the link, byline and score trailing.
 * Reads like a front page's "more stories" rail, not a feed of tiles.
 */
export function DispatchWire({ stories }: { stories: DispatchStory[] }) {
  if (stories.length === 0) return null;

  return (
    <section className="dispatch-section" aria-labelledby="dispatch-wire-heading">
      <h2 id="dispatch-wire-heading" className="dispatch-kicker">
        <span>The Wire</span>
      </h2>

      <ul className="mt-4 divide-y divide-border">
        {stories.map((story) => {
          const ticker = (story.report.ticker ?? story.prediction?.ticker ?? "").toUpperCase();
          return (
            <li key={story.report.id}>
              <Link
                href={`/report/${story.report.id}`}
                className="dispatch-wire-row group focus-ring rounded-[var(--radius-btn)]"
              >
                <span className="num w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-text-mute">
                  {ticker || "—"}
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-[15px] leading-snug text-text transition-colors duration-[var(--dur-2)] group-hover:text-accent">
                  {story.headline}
                </span>
                <span className="hidden shrink-0 items-center gap-2 sm:flex">
                  <span className="text-xs text-text-faint">{story.author.display_name}</span>
                  <MoatBadge
                    handle={story.author.handle}
                    score={story.author.score || null}
                    size="sm"
                    linked={false}
                  />
                </span>
                <ArrowRight
                  size={13}
                  className="shrink-0 self-center text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
