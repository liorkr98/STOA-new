import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ScoreRing } from "@/components/ui/score-ring";
import { SheetTickerChip } from "@/components/markets/instrument-sheet";
import { DirectionTag } from "@/components/ui/tag";
import { SaveToggle } from "@/components/today/save-toggle";
import { durationLabel, sinceLabel, typeLabel } from "@/lib/today/format";
import { cn } from "@/lib/design/cn";
import type { TodayItem } from "@/lib/today/types";

/**
 * The reading-list unit for every Today band. Mono meta line, serif headline,
 * one grey deck line, then the byline. Rows are separated by hairline rules and
 * never boxed -- this is a newspaper column, not a card grid.
 */
export function HeadlineRow({
  item,
  tag,
  className,
}: {
  item: TodayItem;
  /** Right-rail label: SUBSCRIBED, FOLLOWING, an access badge, a saved reason. */
  tag?: ReactNode;
  className?: string;
}) {
  const href = `/report/${item.reportId}`;
  const time = sinceLabel(item.publishedAt);

  return (
    <article className={cn("today-row", className)}>
      <div className="min-w-0 flex-1">
        <div className="today-meta">
          <span>{typeLabel(item.type)}</span>
          {item.ticker ? (
            <SheetTickerChip ticker={item.ticker} />
          ) : item.themeTag ? (
            <span className="today-theme-chip">{item.themeTag}</span>
          ) : null}
          {item.direction ? <DirectionTag direction={item.direction} /> : null}
          <span className="today-meta-badge">{item.contentBadge.join(" · ")}</span>
        </div>

        <Link href={href} className="group focus-ring block rounded-[var(--radius-btn)]">
          <h4 className="today-headline">{item.headline}</h4>
          {item.deck ? <p className="today-deck">{item.deck}</p> : null}
        </Link>

        <div className="today-byline">
          <Link
            href={`/analyst/${item.author.handle}`}
            className="focus-ring inline-flex items-center gap-2.5 rounded-[var(--radius-btn)]"
          >
            <Avatar src={item.author.avatarUrl} name={item.author.displayName} size="sm" />
            <span className="text-[0.8125rem] font-semibold text-text">
              {item.author.displayName}
            </span>
          </Link>
          <ScoreRing score={item.author.score} size="sm" provisional={item.author.provisional} />
          {time ? (
            <span className="num text-[0.6875rem] tracking-[0.08em] text-text-faint">
              <span aria-hidden>· </span>
              {time}
            </span>
          ) : null}
        </div>
      </div>

      <div className="today-row-rail">
        <SaveToggle reportId={item.reportId} initialSaved={item.saved} />
        {tag}
        {item.thumb ? (
          <RowThumb
            href={href}
            thumbnailUrl={item.thumb.thumbnailUrl}
            durationSeconds={item.thumb.durationSeconds}
            headline={item.headline}
          />
        ) : null}
      </div>
    </article>
  );
}

function RowThumb({
  href,
  thumbnailUrl,
  durationSeconds,
  headline,
}: {
  href: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  headline: string;
}) {
  const duration = durationLabel(durationSeconds);
  return (
    <Link href={href} className="today-thumb focus-ring" tabIndex={-1} aria-hidden>
      {thumbnailUrl ? (
        <Image src={thumbnailUrl} alt="" fill sizes="118px" className="object-cover" />
      ) : (
        <span className="today-thumb-empty num">{headline.slice(0, 2).toUpperCase()}</span>
      )}
      <span className="today-thumb-play">
        <Play size={11} fill="currentColor" strokeWidth={0} />
      </span>
      {duration ? <span className="today-thumb-dur num">{duration}</span> : null}
    </Link>
  );
}

/** Small mono label in a row's right rail. */
export function RowTag({
  children,
  tone = "quiet",
}: {
  children: ReactNode;
  tone?: "quiet" | "solid" | "outline";
}) {
  return <span className={cn("today-row-tag", `today-row-tag--${tone}`)}>{children}</span>;
}
