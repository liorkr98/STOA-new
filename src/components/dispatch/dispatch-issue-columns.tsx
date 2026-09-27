import Link from "next/link";
import { BookOpen, Radio } from "lucide-react";
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
  const ticker = (story.report.ticker ?? "").toUpperCase();

  return (
    <FadeIn delay={Math.min(index, 6) * 0.04}>
      <article className="dispatch-issue-card group flex flex-col gap-2.5 rounded-panel border border-border bg-surface p-4 transition-[border-color,transform] duration-[var(--dur-1)] ease-[var(--ease-hover)] hover:-translate-y-px hover:border-border-strong">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {ticker ? (
              <span className="num text-ticker font-semibold text-text">
                {ticker}
              </span>
            ) : null}
          </div>
          {meta ? (
            <span className="num text-ticker text-text-faint">{meta}</span>
          ) : null}
        </div>

        <Link
          href={`/report/${story.report.id}`}
          className="focus-ring rounded-button"
        >
          <h3 className="dispatch-issue-title font-display text-body font-semibold leading-snug text-text transition-colors duration-[var(--dur-2)] group-hover:text-accent">
            {story.headline}
          </h3>
          {story.dek ? (
            <p className="mt-2 line-clamp-3 text-body leading-relaxed text-text-mute">{story.dek}</p>
          ) : null}
        </Link>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Link
            href={`/analyst/${story.author.handle}`}
            className="text-ticker font-medium text-text-mute hover:text-text focus-ring rounded-chip"
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
            "flex h-7 w-7 items-center justify-center rounded-chip border border-border",
            accentClass,
          )}
        >
          <Icon size={14} aria-hidden />
        </span>
        <h2 className="text-body font-semibold text-text">{title}</h2>
        <span className="num ml-auto text-ticker text-text-faint">{stories.length}</span>
      </div>
      {stories.length === 0 ? (
        <p className="text-body text-text-faint">{empty}</p>
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
 * Daily Dispatch-style issue board: research and the wire, on the
 * three-column grid the locked-calls column used to share.
 * Used under the lead on home / public dispatch.
 */
export function DispatchIssueColumns({
  research,
  wire,
}: {
  research: DispatchStory[];
  wire: DispatchStory[];
}) {
  if (research.length === 0 && wire.length === 0) return null;

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
        icon={Radio}
        title="On the wire"
        stories={wire}
        empty="Wire is quiet this cycle."
        accentClass="text-[var(--plum)]"
      />
    </div>
  );
}
