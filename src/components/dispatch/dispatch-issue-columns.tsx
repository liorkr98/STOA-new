import Link from "next/link";
import { BookOpen, LineChart, Radio } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import type { DispatchStory } from "@/lib/dispatch/types";
import { cn } from "@/lib/design/cn";

function IssueCard({
  story,
  index,
  meta,
}: {
  story: DispatchStory;
  index: number;
  meta?: string;
}) {
  const ticker = (story.report.ticker ?? story.prediction?.ticker ?? "").toUpperCase();
  const showTarget = story.report.access === "free";

  return (
    <FadeIn delay={Math.min(index, 6) * 0.04}>
      <article className="dispatch-issue-card group flex flex-col gap-2.5 rounded-[var(--radius-card)] border border-border bg-surface p-4 transition-[border-color,transform] duration-[var(--dur-1)] ease-[var(--ease-hover)] hover:-translate-y-px hover:border-border-strong">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {ticker ? (
              <span className="num text-[11px] font-semibold uppercase tracking-wider text-text">
                {ticker}
              </span>
            ) : null}
            {showTarget && story.prediction?.target_price != null ? (
              <span className="num text-[11px] text-text-faint">
                ${story.prediction.target_price.toFixed(0)}
              </span>
            ) : null}
          </div>
          {meta ? (
            <span className="num text-[10px] uppercase tracking-wider text-text-faint">{meta}</span>
          ) : null}
        </div>

        <Link
          href={`/report/${story.report.id}`}
          className="focus-ring rounded-[var(--radius-btn)]"
        >
          <h3 className="dispatch-issue-title font-display text-[1.05rem] font-semibold leading-snug text-text transition-colors duration-[var(--dur-2)] group-hover:text-accent">
            {story.headline}
          </h3>
          {story.dek ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-mute">{story.dek}</p>
          ) : null}
        </Link>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Link
            href={`/analyst/${story.author.handle}`}
            className="text-xs font-medium text-text-mute hover:text-text focus-ring rounded-[var(--r-tag)]"
          >
            {story.author.display_name}
          </Link>
        </div>
      </article>
    </FadeIn>
  );
}

function Column({
  icon: Icon,
  title,
  stories,
  empty,
  accentClass,
}: {
  icon: typeof BookOpen;
  title: string;
  stories: DispatchStory[];
  empty: string;
  accentClass: string;
}) {
  return (
    <section className="min-w-0" aria-label={title}>
      <div className="mb-4 flex items-center gap-2.5 border-b border-border pb-3">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-[var(--r-tag)] border border-border",
            accentClass,
          )}
        >
          <Icon size={14} aria-hidden />
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-text">{title}</h2>
        <span className="num ml-auto text-[11px] text-text-faint">{stories.length}</span>
      </div>
      {stories.length === 0 ? (
        <p className="text-sm text-text-faint">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {stories.map((s, i) => (
            <IssueCard key={s.report.id} story={s} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Daily Dispatch-style three-column issue board: research, calls, wire.
 * Used under the lead on home / public dispatch.
 */
export function DispatchIssueColumns({
  research,
  calls,
  wire,
}: {
  research: DispatchStory[];
  calls: DispatchStory[];
  wire: DispatchStory[];
}) {
  if (research.length === 0 && calls.length === 0 && wire.length === 0) return null;

  return (
    <div className="dispatch-section dispatch-issue-board grid gap-8 lg:grid-cols-3 lg:gap-6">
      <Column
        icon={BookOpen}
        title="Research"
        stories={research}
        empty="No long-form research in this cycle."
        accentClass="text-text"
      />
      <Column
        icon={LineChart}
        title="Locked calls"
        stories={calls}
        empty="No locked calls in this cycle."
        accentClass="text-[var(--brass)]"
      />
      <Column
        icon={Radio}
        title="On the wire"
        stories={wire}
        empty="Wire is quiet this cycle."
        accentClass="text-[var(--plum)]"
      />
    </div>
  );
}
