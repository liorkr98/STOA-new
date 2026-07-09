import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Lock, MessageCircle, Heart } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { compact } from "@/lib/format";
import type { Report } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { TrackScoreBadge } from "@/components/ui/track-score-badge";

const typeLabel: Record<Report["type"], string> = {
  research: "Research",
  call: "Call",
  short_post: "Post",
};

/**
 * A Discover block: one tile in the mosaic. "lead" spans wide with a large
 * serif headline; "std" is the compact unit. Blocks are the browse surface's
 * own voice -- tiles, not the dispatch's editorial column, not feed cards.
 */
export function ReportBlock({
  report,
  size = "std",
  promoted = false,
}: {
  report: Report;
  size?: "lead" | "std";
  promoted?: boolean;
}) {
  const author = report.author;
  const when = report.published_at ?? report.created_at;
  const locked = report.access !== "free";
  const ticker = (report.ticker ?? report.prediction?.ticker ?? "").toUpperCase();
  const headline = report.title?.trim() || report.summary?.trim() || "Untitled research";
  const dek = report.title && report.summary ? report.summary : null;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-5",
        "transition-[border-color,transform] duration-[var(--dur-1)] ease-[var(--ease-hover)]",
        "hover:-translate-y-0.5 hover:border-border-strong",
        size === "lead" && "sm:p-7",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {promoted && (
          <span className="font-medium uppercase tracking-wide text-accent">Promoted</span>
        )}
        <span className="t-eyebrow">{typeLabel[report.type]}</span>
        {ticker && (
          <span className="num rounded-[var(--r-tag)] border border-border px-1.5 py-px font-semibold">
            {ticker}
          </span>
        )}
        {report.prediction?.target_price != null && (
          <span className="num text-text-faint">
            Target ${report.prediction.target_price.toFixed(0)}
          </span>
        )}
        {locked && <Lock size={11} className="text-text-faint" aria-label="Locked content" />}
      </div>

      <Link href={`/report/${report.id}`} className="focus-ring rounded-[var(--radius-btn)]">
        <span aria-hidden className="absolute inset-0" />
        <h3
          className={cn(
            "font-display font-semibold text-text transition-colors duration-[var(--dur-2)] group-hover:text-accent",
            size === "lead"
              ? "text-2xl leading-tight sm:text-[1.75rem]"
              : "text-lg leading-snug",
          )}
        >
          {headline}
        </h3>
        {dek && (
          <p
            className={cn(
              "mt-2 text-sm leading-relaxed text-text-mute",
              size === "lead" ? "line-clamp-3 max-w-prose" : "line-clamp-2",
            )}
          >
            {dek}
          </p>
        )}
      </Link>

      <div className="relative z-10 mt-auto flex items-center gap-2.5 pt-1">
        {author && (
          <>
            <Link
              href={`/analyst/${author.handle}`}
              className="flex min-w-0 items-center gap-2 focus-ring rounded-[var(--r-tag)]"
            >
              <Avatar src={author.avatar_url} name={author.display_name} size="sm" />
              <span className="truncate text-xs font-medium text-text">
                {author.display_name}
              </span>
            </Link>
            <TrackScoreBadge handle={author.handle} score={author.score || null} size="sm" />
          </>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-3 text-[11px] text-text-faint">
          <span className="num inline-flex items-center gap-1">
            <Heart size={11} aria-hidden /> {compact(report.likes)}
          </span>
          <span className="num inline-flex items-center gap-1">
            <MessageCircle size={11} aria-hidden /> {compact(report.comment_count)}
          </span>
          <span className="hidden sm:inline">
            {formatDistanceToNow(new Date(when), { addSuffix: true })}
          </span>
        </span>
      </div>
    </article>
  );
}
