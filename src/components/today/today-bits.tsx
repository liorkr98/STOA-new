import Link from "next/link";
import { Play } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeChip, TickerChip, StanceChip } from "@/components/ui/chip";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { ClipPendingThumb } from "@/components/video/clip-pending";
import { durationLabel, sinceLabel } from "@/lib/today/format";
import { labelCase } from "@/lib/design/label";
import { cn } from "@/lib/design/cn";
import type { TodayAnalyst, TodayItem } from "@/lib/today/types";

/**
 * The pieces every Today band is built from: the stance or the tag, the
 * byline with a face, the clip's frame, a story tile and a story row.
 */

/**
 * A publication with a stance shows its ticker and direction; one without
 * shows its theme or sector instead. A publication with neither shows
 * nothing, never an empty chip.
 */
export function PublicationTags({ item, className }: { item: TodayItem; className?: string }) {
  if (item.ticker) {
    return (
      <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
        <TickerChip ticker={item.ticker} href={`/markets/${encodeURIComponent(item.ticker)}`} />
        {item.direction ? <StanceChip direction={item.direction} /> : null}
      </span>
    );
  }
  const tag = item.themeTag ?? item.sector;
  if (!tag) return null;
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <ThemeChip label={labelCase(tag)} />
    </span>
  );
}

/**
 * Face, name, and a muted tail (the time, or the analyst's beat). `stacked`
 * puts the tail under the name, so a long tail never squeezes the name.
 */
export function Byline({
  author,
  tail,
  size = 22,
  stacked = false,
  className,
}: {
  author: TodayAnalyst;
  tail?: string | null;
  size?: number;
  stacked?: boolean;
  className?: string;
}) {
  if (stacked) {
    return (
      <Link href={`/analyst/${author.handle}`} className={cn("focus-ring flex min-w-0 items-center gap-3 rounded-chip", className)}>
        <Avatar src={author.avatarUrl} name={author.displayName} size={size} />
        <span className="min-w-0">
          <span className="block truncate text-body font-semibold text-text">{author.displayName}</span>
          {tail ? <span className="num block text-ticker text-text-mute">{tail}</span> : null}
        </span>
      </Link>
    );
  }
  return (
    <p className={cn("flex min-w-0 items-center gap-2 text-ticker text-text-mute", className)}>
      <Link href={`/analyst/${author.handle}`} className="focus-ring flex min-w-0 items-center gap-2 rounded-chip">
        <Avatar src={author.avatarUrl} name={author.displayName} size={size} />
        <span className="truncate font-semibold text-text">{author.displayName}</span>
      </Link>
      {tail ? (
        <>
          <span aria-hidden>·</span>
          <span className="num shrink-0">{tail}</span>
        </>
      ) : null}
    </p>
  );
}

/** "2h ago", and "Trending" or "New" when the lifecycle says so. */
export function storyTail(item: TodayItem): string {
  const when = sinceLabel(item.publishedAt);
  const marker = item.stageMarker ? labelCase(item.stageMarker) : null;
  return [when, marker].filter(Boolean).join(" · ");
}

/**
 * The clip's frame: the real poster, or the processing frame for a clip
 * still being prepared. Only for a publication that has a clip; a written
 * piece has no frame at all.
 */
export function ClipFrame({
  item,
  className,
  duration = true,
  eager = false,
}: {
  item: TodayItem;
  className?: string;
  duration?: boolean;
  eager?: boolean;
}) {
  if (!item.thumb) return null;
  const length = item.thumb.processing ? "" : durationLabel(item.thumb.durationSeconds);
  return (
    <Link
      href={`/report/${item.reportId}`}
      tabIndex={-1}
      aria-hidden
      className={cn("relative block overflow-hidden rounded-panel bg-surface-2", className)}
    >
      {item.thumb.processing ? (
        <ClipPendingThumb />
      ) : (
        <ClipThumb src={item.thumb.thumbnailUrl} seed={item.author.id} loading={eager ? "eager" : "lazy"} />
      )}
      {duration && length ? <span className="today-duration num">{length}</span> : null}
    </Link>
  );
}

/** A picture story: a square frame, the title, the stance or tag, the face. */
export function StoryTile({ item, className }: { item: TodayItem; className?: string }) {
  return (
    <article className={cn("min-w-0", className)}>
      <ClipFrame item={item} className="aspect-square" />
      <h3 className="t-title mt-3 line-clamp-3 text-text">
        <Link href={`/report/${item.reportId}`} className="focus-ring rounded-inner">
          {item.headline}
        </Link>
      </h3>
      <PublicationTags item={item} className="mt-2" />
      <Byline author={item.author} className="mt-2.5" />
    </article>
  );
}

/**
 * A story in a list: the face first, the title and its line of detail, and
 * the clip's frame at the end when there is one. Rows part by space, not by
 * rules.
 */
export function StoryRow({ item, className }: { item: TodayItem; className?: string }) {
  return (
    <article className={cn("flex min-w-0 items-start gap-4", className)}>
      <Link href={`/analyst/${item.author.handle}`} className="focus-ring shrink-0 rounded-avatar" aria-label={item.author.displayName}>
        <Avatar src={item.author.avatarUrl} name={item.author.displayName} size={44} />
      </Link>
      <div className="min-w-0 flex-1">
        <h3 className="t-title line-clamp-3 text-text">
          <Link href={`/report/${item.reportId}`} className="focus-ring rounded-inner">
            {item.headline}
          </Link>
        </h3>
        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 text-ticker text-text-mute">
          <Link href={`/analyst/${item.author.handle}`} className="focus-ring truncate rounded-chip font-semibold text-text">
            {item.author.displayName}
          </Link>
          <span aria-hidden>·</span>
          <span className="num">{storyTail(item)}</span>
        </p>
        <PublicationTags item={item} className="mt-2" />
      </div>
      {item.thumb ? <ClipFrame item={item} duration={false} className="aspect-square w-[72px] shrink-0 !rounded-inner sm:w-24" /> : null}
    </article>
  );
}

/** The lead's play control: a white disc, the only thing drawn on the picture. */
export function PlayDisc({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("today-play", className)}>
      <Play size={18} fill="currentColor" strokeWidth={0} className="ml-0.5" />
    </span>
  );
}
