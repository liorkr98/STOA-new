import Link from "next/link";
import { Play } from "lucide-react";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { ClipPendingThumb } from "@/components/video/clip-pending";
import { durationLabel, sinceLabel, typeLabel } from "@/lib/today/format";
import { cn } from "@/lib/design/cn";
import type { TodayItem } from "@/lib/today/types";

/**
 * One card anatomy, everywhere on Today.
 *
 * Image (16:9, square corners) → 12px → eyebrow → 10px → headline → 12px →
 * byline. The eyebrow carries the ticker and direction ("NVDA · LONG") or
 * the sector, with TRENDING or NEW in front when the lifecycle says so. The
 * byline is the name and the date, nothing else: no avatar, no content
 * badge. Every size here is one of the page's five (globals.css, `.ts-*`).
 */

/**
 * The eyebrow's words: TRENDING or NEW, then the ticker, then the direction
 * on its own so it can carry its sentiment colour; or the sector, the
 * theme, or the type when there is no ticker.
 */
export function eyebrowFor(item: TodayItem): { label: string; direction: TodayItem["direction"] } {
  const parts: string[] = [];
  if (item.stageMarker) parts.push(item.stageMarker);
  if (item.ticker) parts.push(item.ticker);
  else if (item.sector) parts.push(item.sector.toUpperCase());
  else if (item.themeTag) parts.push(item.themeTag.toUpperCase());
  else parts.push(typeLabel(item.type));
  return { label: parts.join(" · "), direction: item.ticker ? item.direction : null };
}

/** The eyebrow as marked-up text: brass label, the direction word in its own colour. */
export function EyebrowText({ item, className }: { item: TodayItem; className?: string }) {
  const { label, direction } = eyebrowFor(item);
  return (
    <span className={cn("ts-eyebrow", className)}>
      {label}
      {direction ? (
        <>
          <span aria-hidden> · </span>
          <span className={`ts-dir--${direction}`}>{direction.toUpperCase()}</span>
        </>
      ) : null}
    </span>
  );
}

/** "2h ago", "3d ago", "Jul 20": the mono stamp, in the byline's own case. */
export function bylineDate(iso: string | null | undefined): string {
  const s = sinceLabel(iso).toLowerCase();
  return s.replace(/^([a-z])/, (c) => c.toUpperCase()).replace(/^(\d)/, "$1");
}

export function TodayEyebrow({
  item,
  duration,
  className,
}: {
  item: TodayItem;
  /** The clip's length, as mono text on the eyebrow line rather than a pill on the image. */
  duration?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <EyebrowText item={item} className="min-w-0 truncate" />
      {duration ? <span className="ts-mono shrink-0">{duration}</span> : null}
    </div>
  );
}

export function TodayByline({ item, className }: { item: TodayItem; className?: string }) {
  return (
    <p className={cn("ts-byline truncate", className)}>
      <Link href={`/analyst/${item.author.handle}`} className="focus-ring rounded">
        {item.author.displayName}
      </Link>
      <span aria-hidden> / </span>
      <span>{bylineDate(item.publishedAt)}</span>
    </p>
  );
}

/**
 * The picture: the clip's poster at 16:9 with square corners and a small
 * play glyph in the corner. Only for an item that has a clip; a written
 * piece has no image area at all.
 */
export function CardImage({ item, className }: { item: TodayItem; className?: string }) {
  if (!item.thumb) return null;
  return (
    <Link href={`/report/${item.reportId}`} className={cn("ts-image focus-ring", className)} tabIndex={-1} aria-hidden>
      {item.thumb.processing ? (
        <ClipPendingThumb />
      ) : (
        <>
          <ClipThumb src={item.thumb.thumbnailUrl} seed={item.author.id} />
          <span className="ts-play">
            <Play size={10} fill="currentColor" strokeWidth={0} className="ml-px" />
          </span>
        </>
      )}
    </Link>
  );
}

export function TodayCard({
  item,
  dense = false,
  image = true,
  className,
}: {
  item: TodayItem;
  /** 18px headline, for a dense grid. */
  dense?: boolean;
  /** Text-only lists set this false; a clip's poster is then not shown. */
  image?: boolean;
  className?: string;
}) {
  const picture = image && item.thumb ? item.thumb : null;
  return (
    <article className={cn("min-w-0", className)}>
      {picture ? <CardImage item={item} /> : null}
      <div className={cn(picture && "mt-3")}>
        <TodayEyebrow item={item} duration={picture && !picture.processing ? durationLabel(picture.durationSeconds) : null} />
        <h3 className={cn("ts-headline mt-2.5", dense && "ts-headline--dense")}>
          <Link href={`/report/${item.reportId}`} className="focus-ring rounded">
            {item.headline}
          </Link>
        </h3>
        <TodayByline item={item} className="mt-3" />
      </div>
    </article>
  );
}
