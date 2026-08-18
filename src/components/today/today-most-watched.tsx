import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TickerChip } from "@/components/ui/ticker-chip";
import { Band } from "@/components/ui/band";
import { durationLabel } from "@/lib/today/format";
import { compact } from "@/lib/format";
import type { TodayVideo } from "@/lib/today/types";

/**
 * Most Watched. Four portrait stills in a row on desktop, a horizontal
 * scroller on phones. Ordered by publication views: the per-clip play counts
 * in `video_view_events` are readable only by the clip's own creator, so the
 * count shown here is the publication's, and is labelled as such.
 */
export function TodayMostWatched({ videos }: { videos: TodayVideo[] }) {
  if (videos.length === 0) return null;

  return (
    <Band
      title="Most Watched"
      note="Today's most-watched analyst videos."
      seeAllHref="/discover"
    >
      <div className="today-watch-strip scroll-area">
        {videos.map((video) => (
          <VideoStill key={video.videoId} video={video} />
        ))}
      </div>
      <p className="today-gap-note">
        Ranked by publication views. Per-video play counts are not yet readable outside the
        analyst&apos;s own studio.
      </p>
    </Band>
  );
}

function VideoStill({ video }: { video: TodayVideo }) {
  const href = `/report/${video.reportId}`;
  const duration = durationLabel(video.durationSeconds);

  return (
    <article className="min-w-0">
      <Link href={href} className="today-watch-still focus-ring">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 25vw, 68vw"
            className="object-cover"
          />
        ) : (
          <span className="today-thumb-empty num" aria-hidden>
            {video.ticker ?? "STOA"}
          </span>
        )}
        <span className="today-thumb-play">
          <Play size={11} fill="currentColor" strokeWidth={0} />
        </span>
        {duration ? <span className="today-thumb-dur num">{duration}</span> : null}
      </Link>

      <div className="today-meta mt-3">
        {video.ticker ? <TickerChip ticker={video.ticker} /> : null}
        <span>{compact(video.publicationViews)} views</span>
      </div>

      <Link href={href} className="group focus-ring block rounded-[var(--radius-btn)]">
        <h4 className="today-headline text-[1.0625rem]">{video.headline}</h4>
      </Link>

      <p className="num mt-2 text-[0.625rem] uppercase tracking-[0.12em] text-text-faint">
        {video.contentBadge.join(" · ")}
      </p>

      <div className="today-byline">
        <Link
          href={`/analyst/${video.author.handle}`}
          className="focus-ring inline-flex items-center gap-2.5 rounded-[var(--radius-btn)]"
        >
          <Avatar src={video.author.avatarUrl} name={video.author.displayName} size="sm" />
          <span className="text-[0.8125rem] font-semibold text-text">
            {video.author.displayName}
          </span>
        </Link>
      </div>
    </article>
  );
}
