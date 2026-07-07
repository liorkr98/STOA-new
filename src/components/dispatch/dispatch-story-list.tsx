import Link from "next/link";
import { MoatBadge } from "@/components/ui/moat-badge";
import type { DispatchStory } from "@/lib/dispatch/types";

/**
 * Featured stories after the lead: a two-column newspaper block with a real
 * column rule. Denser than cards, richer than a wire line -- each story gets
 * a serif headline, a clamped dek, and a byline with the analyst's score.
 */
export function DispatchStoryList({
  stories,
  title = "In this issue",
}: {
  stories: DispatchStory[];
  title?: string;
}) {
  if (stories.length === 0) return null;

  return (
    <section className="dispatch-section" aria-labelledby="dispatch-secondary-heading">
      <h2 id="dispatch-secondary-heading" className="dispatch-kicker">
        <span>{title}</span>
      </h2>

      <div className="dispatch-columns mt-6">
        {stories.map((story) => {
          const ticker = (story.report.ticker ?? story.prediction?.ticker ?? "").toUpperCase();
          return (
            <article key={story.report.id} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                {ticker && (
                  <span className="num text-[11px] font-semibold uppercase tracking-wider text-text">
                    {ticker}
                  </span>
                )}
                {story.prediction?.target_price != null && (
                  <span className="num text-[11px] text-text-faint">
                    Target ${story.prediction.target_price.toFixed(0)}
                  </span>
                )}
              </div>

              <Link
                href={`/report/${story.report.id}`}
                className="group focus-ring rounded-[var(--radius-btn)]"
              >
                <h3 className="dispatch-story-headline transition-colors duration-[var(--dur-2)] group-hover:text-accent">
                  {story.headline}
                </h3>
                {story.dek && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-mute">
                    {story.dek}
                  </p>
                )}
              </Link>

              <div className="mt-auto flex items-center gap-2 pt-1">
                <Link
                  href={`/analyst/${story.author.handle}`}
                  className="text-xs font-medium text-text-mute hover:text-text focus-ring rounded-[var(--r-tag)]"
                >
                  {story.author.display_name}
                </Link>
                <MoatBadge
                  handle={story.author.handle}
                  score={story.author.score || null}
                  size="sm"
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
