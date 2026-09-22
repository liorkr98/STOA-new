import Link from "next/link";
import { Play } from "lucide-react";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { ClipPendingThumb } from "@/components/video/clip-pending";
import { CardImage, EyebrowText, TodayCard, bylineDate } from "@/components/today/today-card";
import { durationLabel } from "@/lib/today/format";
import { cn } from "@/lib/design/cn";
import type { TodayItem } from "@/lib/today/types";

/**
 * The top package, 3 / 6 / 3 on a desktop.
 *
 * Left: two picture stories. Centre: the lead in a 4:3 frame with its
 * eyebrow, headline and byline in white over a scrim on the lower third,
 * and under it two smaller stories on the same name or sector, so the lead
 * and its follow-ups read as one package. Right: four text stories on
 * hairlines. On a phone the lead comes first, then the pictures, then the
 * text stories, in one column.
 */

function Lead({ lead }: { lead: TodayItem }) {
  const href = `/report/${lead.reportId}`;
  if (!lead.thumb) {
    return (
      <article className="min-w-0">
        <EyebrowText item={lead} className="block" />
        <h1 className="ts-headline ts-headline--lead mt-2.5">
          <Link href={href} className="focus-ring rounded">
            {lead.headline}
          </Link>
        </h1>
        {lead.deck ? <p className="mt-3 max-w-[60ch] font-sans text-[16px] leading-relaxed text-text-mute">{lead.deck}</p> : null}
        <p className="ts-byline mt-3">
          <Link href={`/analyst/${lead.author.handle}`} className="focus-ring rounded">
            {lead.author.displayName}
          </Link>
          <span aria-hidden> / </span>
          <span>{bylineDate(lead.publishedAt)}</span>
        </p>
      </article>
    );
  }
  const duration = lead.thumb.processing ? null : durationLabel(lead.thumb.durationSeconds);
  return (
    <article className="min-w-0">
      <Link href={href} className="ts-image ts-image--lead focus-ring">
        {lead.thumb.processing ? <ClipPendingThumb /> : <ClipThumb src={lead.thumb.thumbnailUrl} seed={lead.author.id} loading="eager" />}
        <span aria-hidden className="ts-scrim" />
        <span className="ts-on-scrim absolute inset-x-0 bottom-0 p-5 text-white md:p-6">
          <span className="flex items-baseline justify-between gap-3">
            <EyebrowText item={lead} className="min-w-0 truncate" />
            {duration ? <span className="ts-mono shrink-0 !text-white/70">{duration}</span> : null}
          </span>
          <span className="ts-headline ts-headline--lead mt-2.5 block !text-white">{lead.headline}</span>
          <span className="ts-byline mt-3 block !text-white/70">
            <span className="ts-name">{lead.author.displayName}</span>
            <span aria-hidden> / </span>
            {bylineDate(lead.publishedAt)}
          </span>
        </span>
        {lead.thumb.processing ? null : (
          <span className="ts-play !bottom-auto !top-3 !inset-inline-start-3">
            <Play size={10} fill="currentColor" strokeWidth={0} className="ml-px" />
          </span>
        )}
      </Link>
    </article>
  );
}

export function TodayPackage({
  lead,
  followUps,
  pictures,
  textStories,
  className,
}: {
  lead: TodayItem;
  followUps: TodayItem[];
  pictures: TodayItem[];
  textStories: TodayItem[];
  className?: string;
}) {
  return (
    <section
      aria-label="The lead"
      className={cn("grid grid-cols-4 gap-x-4 gap-y-10 md:grid-cols-12 md:gap-x-5 md:gap-y-0", className)}
    >
      <div className="order-1 col-span-4 md:order-none md:col-span-6 md:col-start-4 md:row-start-1">
        <Lead lead={lead} />
        {followUps.length > 0 ? (
          <div className="ts-rule mt-4 grid grid-cols-2 gap-x-4 pt-4 md:gap-x-5">
            {followUps.map((it) => (
              <TodayCard key={it.reportId} item={it} dense />
            ))}
          </div>
        ) : null}
      </div>
      {pictures.length > 0 ? (
        <div className="order-2 col-span-4 md:order-none md:col-span-3 md:col-start-1 md:row-start-1">
          <div className="ts-stack">
            {pictures.map((it) => (
              <TodayCard key={it.reportId} item={it} />
            ))}
          </div>
        </div>
      ) : null}
      {textStories.length > 0 ? (
        <div className="order-3 col-span-4 md:order-none md:col-span-3 md:col-start-10 md:row-start-1">
          <div className="ts-stack">
            {textStories.map((it) => (
              <TodayCard key={it.reportId} item={it} image={false} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { CardImage };
