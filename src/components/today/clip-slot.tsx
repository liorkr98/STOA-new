import Link from "next/link";
import { Play } from "lucide-react";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { durationLabel } from "@/lib/today/format";
import { cn } from "@/lib/design/cn";
import type { TodayItem } from "@/lib/today/types";

/**
 * A publication's clip as a small frame beside its headline, and nothing at all
 * when the publication has no clip.
 *
 * The single test is whether a clip is stored: `thumb` is null when there is
 * none, and the component then renders nothing, so a written report keeps a
 * plain headline and no image area is reserved for a video that does not exist.
 *
 * The generated placeholder still appears inside the frame for the other case,
 * a clip whose poster frame the CDN has not produced yet. That is a video with
 * no still, not a publication with no video.
 *
 * It owns its own link and its own emptiness so neither rule can be got wrong
 * at a call site: an `if` at each one would leave empty anchors and stray gaps
 * behind as bands are added.
 */
export function ClipSlot({
  thumb,
  href,
  analystId,
  size = "sm",
  className,
}: {
  thumb: TodayItem["thumb"];
  href: string;
  analystId: string | null | undefined;
  /**
   * `sm` sits beside a headline, `md` is the full-width row rail, and `wide`
   * fills its column above the headline, for columns too narrow to give up
   * 84px sideways.
   */
  size?: "sm" | "md" | "wide";
  className?: string;
}) {
  if (!thumb) return null;
  const duration = durationLabel(thumb.durationSeconds);
  return (
    <Link
      href={href}
      className={cn(
        "today-thumb focus-ring",
        size === "sm" && "today-thumb--sm",
        size === "wide" && "today-thumb--wide",
        className,
      )}
      tabIndex={-1}
      aria-hidden
    >
      <ClipThumb src={thumb.thumbnailUrl} seed={analystId} />
      <span className="today-thumb-play">
        <Play size={11} fill="currentColor" strokeWidth={0} />
      </span>
      {duration ? <span className="today-thumb-dur num">{duration}</span> : null}
    </Link>
  );
}
