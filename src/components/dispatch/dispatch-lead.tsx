import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ScoreRing } from "@/components/ui/score-ring";
import { SealStamp, type SealStatus } from "@/components/ui/seal-stamp";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/design/cn";
import type { Outcome } from "@/lib/types";
import type { DispatchStory } from "@/lib/dispatch/types";

/** The seal is semantic: only a call (a prediction) earns one. */
function outcomeToSeal(o: Outcome | undefined | null): SealStatus | null {
  switch (o) {
    case "hit":
      return "hit";
    case "miss":
      return "miss";
    case "near":
    case "partial":
    case "neutral":
      return "near";
    case "open":
      return "locked";
    default:
      return null;
  }
}

/**
 * Content facets shown as mono chips. CALL and THESIS are derived from the
 * report; VIDEO and CARDS are placeholders until the content model exposes
 * those flags (see the dispatch data-gap notes) — shown, per the house rule, as
 * placeholders rather than omitted so the row matches the design.
 */
function contentBadges(story: DispatchStory): string[] {
  const badges = ["Video"];
  if (story.prediction || story.report.type === "call") badges.push("Call");
  badges.push("Cards");
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
  const { report, author, prediction, headline, dek } = story;
  const centered = align === "center";

  // Kicker source label — derived from access; a subscription-gated lead reads
  // "from your subscriptions", an open one "from analysts you follow".
  const source = report.access === "free" ? "From analysts you follow" : "From your subscriptions";

  const sealStatus = outcomeToSeal(prediction?.outcome);
  const resolved = Boolean(prediction) && prediction!.outcome !== "open";
  const sealDate = new Date(
    resolved
      ? prediction!.resolution_trading_date ?? prediction!.resolves_at
      : report.locked_at ?? report.published_at ?? report.created_at,
  );

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

          {sealStatus && (
            <div className="hidden shrink-0 sm:flex sm:items-start sm:justify-end">
              <SealStamp status={sealStatus} date={sealDate} size="lg" animateOnView />
            </div>
          )}
        </div>

        {/* Byline: identity · track score + rank · content facets · read link */}
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

          <span aria-hidden className="hidden h-8 w-px bg-border sm:block" />

          <Link
            href={`/analyst/${author.handle}/score`}
            className="flex items-center gap-3 focus-ring rounded-[var(--radius-btn)]"
            title={author.score ? `Track Score ${author.score}` : "Not yet scored"}
          >
            <ScoreRing score={author.score || null} size="md" />
            <span className="num flex flex-col text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-text-faint">
              <span>Track Score</span>
              {/* Rank is a placeholder until per-cycle ranking is wired in. */}
              <span>Rank #—</span>
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
