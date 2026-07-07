import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MoatBadge } from "@/components/ui/moat-badge";
import type { DispatchStory } from "@/lib/dispatch/types";

export function DispatchStoryList({
  stories,
  title = "Also in this issue",
}: {
  stories: DispatchStory[];
  title?: string;
}) {
  if (stories.length === 0) return null;

  return (
    <section className="dispatch-secondary" aria-labelledby="dispatch-secondary-heading">
      <h2 id="dispatch-secondary-heading" className="dispatch-section-label">
        {title}
      </h2>
      <ul className="mt-4 divide-y divide-border">
        {stories.map((story) => {
          const ticker = (story.report.ticker ?? story.prediction?.ticker ?? "").toUpperCase();
          return (
            <li key={story.report.id}>
              <Link
                href={`/report/${reportId(story)}`}
                className="group flex flex-wrap items-baseline gap-x-2 gap-y-1 py-4 focus-ring rounded-[var(--r-btn)]"
              >
                {ticker && (
                  <span className="num text-[11px] font-semibold uppercase tracking-wider text-text">
                    {ticker}
                  </span>
                )}
                {ticker && (
                  <span className="text-text-faint" aria-hidden>
                    ·
                  </span>
                )}
                <span className="text-sm font-medium text-text-mute">{story.author.display_name}</span>
                <MoatBadge
                  handle={story.author.handle}
                  score={story.author.score || null}
                  size="sm"
                />
                <span className="min-w-0 flex-1 basis-full sm:basis-auto sm:pl-2 font-display text-base leading-snug text-text group-hover:text-accent transition-colors duration-[var(--dur-2)]">
                  {story.headline}
                </span>
                <ArrowRight
                  size={14}
                  className="ml-auto shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
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

function reportId(story: DispatchStory) {
  return story.report.id;
}
