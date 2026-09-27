import Link from "next/link";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { ClipPendingThumb } from "@/components/video/clip-pending";
import { Byline, PlayDisc, PublicationTags, storyTail } from "@/components/today/today-bits";
import { cn } from "@/lib/design/cn";
import type { TodayItem } from "@/lib/today/types";

/**
 * The lead: the day's strongest publication, whatever its form.
 *
 * With a clip it splits in two: the picture at 4:5 with a play control on
 * one side, the headline at display size, the analyst and the stance on the
 * other. On a phone it stacks, picture first. With no clip there is no
 * frame at all; the headline takes the whole width. A clip still being
 * prepared keeps its frame and says so, without a play control.
 */

// Past this the display size runs to six or seven lines beside the picture.
const DISPLAY_MAX_CHARS = 80;

function LeadText({ lead, wide }: { lead: TodayItem; wide: boolean }) {
  const long = lead.headline.length > DISPLAY_MAX_CHARS;
  return (
    <div className="min-w-0">
      <h2 className={cn(long ? "t-headline" : "t-display", "text-text [text-wrap:balance]", wide && "max-w-[18ch]")}>
        <Link href={`/report/${lead.reportId}`} className="focus-ring rounded-inner">
          {lead.headline}
        </Link>
      </h2>
      {lead.deck ? (
        <p className={cn("user-copy mt-4 line-clamp-3 text-body text-text-mute", wide ? "max-w-[60ch]" : "max-w-[48ch]")}>
          {lead.deck}
        </p>
      ) : null}
      <Byline
        author={lead.author}
        size={44}
        stacked
        tail={[lead.author.specialty, storyTail(lead)].filter(Boolean).join(" · ")}
        className="mt-6 w-fit"
      />
      <PublicationTags item={lead} className="mt-5" />
    </div>
  );
}

export function TodayLead({ lead, className }: { lead: TodayItem; className?: string }) {
  if (!lead.thumb) {
    return (
      <section aria-label="The lead" className={className}>
        <LeadText lead={lead} wide />
      </section>
    );
  }
  const processing = Boolean(lead.thumb.processing);
  return (
    <section
      aria-label="The lead"
      className={cn("grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-10", className)}
    >
      <Link
        href={`/report/${lead.reportId}`}
        aria-label={processing ? `${lead.headline} (video processing)` : `Watch: ${lead.headline}`}
        className="focus-ring relative block aspect-[4/5] overflow-hidden rounded-panel bg-surface-2"
      >
        {processing ? (
          <ClipPendingThumb />
        ) : (
          <>
            <ClipThumb src={lead.thumb.thumbnailUrl} seed={lead.author.id} loading="eager" />
            <PlayDisc />
          </>
        )}
      </Link>
      <LeadText lead={lead} wide={false} />
    </section>
  );
}
