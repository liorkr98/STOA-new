import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/design/cn";
import type { DispatchStory } from "@/lib/dispatch/types";

/**
 * Content facets shown as mono chips. THESIS is derived from the report;
 * VIDEO and CARDS are placeholders until the content model exposes
 * those flags (see the dispatch data-gap notes) — shown, per the house rule, as
 * placeholders rather than omitted so the row matches the design.
 */
function contentBadges(story: DispatchStory): string[] {
  const badges = ["Video", "Cards"];
  if (story.report.body) badges.push("Thesis");
  return badges;
}

export function DispatchLead({
  story,
  align = "start",
}: {
  story: DispatchStory;
  align?: "center" | "start";
}) {
  const { report, author, headline, dek } = story;
  const centered = align === "center";

  // Kicker source label — derived from access; a subscription-gated lead reads
  // "from your subscriptions", an open one "from analysts you follow".
  const source = report.access === "free" ? "From analysts you follow" : "From your subscriptions";

  const badges = contentBadges(story);

  return (
    <FadeIn>
      <article className="dispatch-section">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:gap-10">
          <div className="min-w-0">
            <p className="num text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--verdigris)]">
              Today&apos;s Lead
              <span className="mx-1.5 text-text-faint" aria-hidden>
                ·
              </span>
              <span className="text-text-mute">{source}</span>
            </p>

            <Link
              href={`/report/${report.id}`}
              className="group mt-4 block focus-ring rounded-[var(--radius-btn)]"
            >
              <h2
                className={cn(
                  "dispatch-lead-headline transition-colors duration-[var(--dur-2)] group-hover:text-accent",
                  !centered && "dispatch-lead-headline--start text-left",
                )}
              >
                {headline}
              </h2>
              {dek && (
                <p
                  className={cn(
                    "dispatch-lead-dek mt-4",
                    !centered && "dispatch-lead-dek--start text-left mx-0",
                  )}
                >
                  {dek}
                </p>
              )}
            </Link>
          </div>

        </div>

        {/* Byline: identity · content facets · read link */}
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4 border-t border-border pt-5">
          <Link
            href={`/analyst/${author.handle}`}
            className="flex items-center gap-3 focus-ring rounded-[var(--radius-btn)]"
          >
            <Avatar src={author.avatar_url} name={author.display_name} size="md" />
            <span className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-text">{author.display_name}</span>
                {author.verified && (
                  <BadgeCheck size={15} className="text-[var(--verdigris)]" aria-label="Verified" />
                )}
              </span>
              <span className="num text-xs text-text-faint">@{author.handle}</span>
            </span>
          </Link>

          <span
            className="num hidden text-[10px] uppercase tracking-[0.14em] text-text-faint sm:inline"
            aria-label="Content in this report"
          >
            {badges.join("  ·  ")}
          </span>

          <Link
            href={`/report/${report.id}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] text-sm font-medium text-accent focus-ring hover:underline"
          >
            Read the report
            <ArrowRight size={14} />
          </Link>
        </div>
      </article>
    </FadeIn>
  );
}
