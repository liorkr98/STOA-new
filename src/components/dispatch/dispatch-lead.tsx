import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DirectionTag } from "@/components/ui/tag";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/design/cn";
import type { DispatchStory } from "@/lib/dispatch/types";

function scoreColor(score: number) {
  if (score >= 70) return "var(--verdigris)";
  if (score >= 40) return "var(--brass)";
  return "var(--rust)";
}

/** Large inline MOAT display for the lead byline: the score is the point. */
function LeadScore({ handle, score }: { handle: string; score: number | null }) {
  const color = score == null ? "var(--text-faint)" : scoreColor(score);
  return (
    <Link
      href={`/analyst/${handle}/moat`}
      className="group/score flex items-center gap-2.5 focus-ring rounded-[var(--radius-btn)]"
      title={score == null ? "Not yet scored" : `MOAT ${score}`}
    >
      <span
        aria-hidden
        className="inline-block h-7 w-7 shrink-0 rounded-full"
        style={{ border: `2.5px solid ${color}` }}
      />
      <span className="flex flex-col leading-none">
        <span className="num text-2xl font-semibold tabular-nums" style={{ color }}>
          {score ?? "—"}
        </span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-text-faint transition-colors group-hover/score:text-text-mute">
          Moat
        </span>
      </span>
    </Link>
  );
}

export function DispatchLead({
  story,
  align = "center",
}: {
  story: DispatchStory;
  align?: "center" | "start";
}) {
  const { report, author, prediction, headline, dek } = story;
  const ticker = (report.ticker ?? prediction?.ticker ?? "").toUpperCase();
  const centered = align === "center";

  return (
    <FadeIn>
      <article className="dispatch-section">
        <div className="dispatch-kicker">
          <span>The Lead</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {ticker && (
            <span className="num rounded-[var(--r-tag)] border border-border-strong px-2 py-0.5 text-xs font-semibold tracking-wide">
              {ticker}
            </span>
          )}
          {prediction && <DirectionTag direction={prediction.direction} />}
          {prediction?.target_price != null && (
            <span className="num text-xs text-text-mute">
              Target ${prediction.target_price.toFixed(2)}
            </span>
          )}
          {prediction?.target_horizon_date && (
            <span className="num text-xs text-text-faint">
              by{" "}
              {new Date(prediction.target_horizon_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

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

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4 border-t border-border pt-5">
          <Link
            href={`/analyst/${author.handle}`}
            className="flex items-center gap-3 focus-ring rounded-[var(--radius-btn)]"
          >
            <Avatar src={author.avatar_url} name={author.display_name} size="md" />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-text">{author.display_name}</span>
              <span className="text-xs text-text-faint">@{author.handle}</span>
            </span>
          </Link>

          <span aria-hidden className="hidden h-8 w-px bg-border sm:block" />

          <LeadScore handle={author.handle} score={author.score || null} />

          <Link
            href={`/report/${report.id}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] text-sm font-medium text-accent focus-ring hover:underline"
          >
            Read the full report
            <ArrowRight size={14} />
          </Link>
        </div>
      </article>
    </FadeIn>
  );
}
