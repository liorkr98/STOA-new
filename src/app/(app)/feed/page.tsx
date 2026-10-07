import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { FeedSurface } from "@/components/feed/feed-surface";
import { VisitorFeed } from "@/components/feed/visitor-feed";
import { clipsToPublications, attachViewerSocial } from "@/lib/feed/build-publications";
import { postFeedComment } from "@/app/actions/feed";
import { listVideoClipCards } from "@/lib/db/video-clips";
import { getSessionUserId } from "@/lib/db/auth";
import { recordRankingImpressions } from "@/lib/db/ranking";
import { loadViewerContext } from "@/lib/ranking/context";
import { pinRequestedReport, rankClips } from "@/lib/ranking/rank";

export const metadata: Metadata = { title: "Feed" };

/** First page of the Feed. Comments load when Discuss opens. */
const FEED_PAGE_SIZE = 30;
/** Ranker pool: larger than the session so scoring and file-uniqueness see more than the newest 30. */
const FEED_CANDIDATE_POOL = 120;
/** What a signed-out visitor may watch before the wall. Only these are sent. */
const VISITOR_FREE_VIDEOS = 3;

/**
 * The Feed: the only video discovery surface in the product.
 *
 * It is a full-screen vertical reader, one publication per viewport. There are
 * no tabs, no layout toggle and no text mosaic: a publication reaches this
 * surface because it has a clip, and the clip is the point. Everything the old
 * text listing did is Explore's job now, which is the wall you scan rather than
 * the reader you fall into.
 *
 * `?at=<publication id>` opens partway in, which is how an Explore tile hands
 * over: the reader taps a face on the wall and lands on that face here.
 *
 * Order comes from the Feed ranker (likes, comments, completion, click-through,
 * watchlist, recency). Not recency alone.
 *
 * **Visitors get three.** Streaming video is the most expensive thing the
 * product does per view, so a signed-out visitor is sent the first three
 * publications and nothing more: the page data holds three, and where the
 * fourth would be the visitor meets the wall (Join Stoa, Log in), which
 * returns them here. Signed in, the Feed is unchanged.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const sessionId = crypto.randomUUID();
  const [atParams, userId] = await Promise.all([searchParams, getSessionUserId()]);
  const { at } = atParams;

  // Comments wait until Discuss opens.
  const [clips, viewer] = await Promise.all([
    listVideoClipCards(FEED_CANDIDATE_POOL),
    loadViewerContext(),
  ]);

  const limit = userId ? FEED_PAGE_SIZE : VISITOR_FREE_VIDEOS;
  const pinned = pinRequestedReport(await rankClips(clips, viewer, "feed"), clips, at);
  // A requested publication ranked past the cut would be sliced away and the
  // link would open somewhere else, so it moves up to lead instead.
  const atIndex = at ? pinned.findIndex((r) => r.reportId === at) : -1;
  const ranked = (
    atIndex >= limit ? [pinned[atIndex], ...pinned.slice(0, atIndex), ...pinned.slice(atIndex + 1)] : pinned
  ).slice(0, limit);
  const publications = ranked.length > 0 ? await clipsToPublications(ranked.map((r) => r.item)) : [];
  const withSocial = await attachViewerSocial(publications, userId);
  const reasonsByReport = new Map(ranked.map((r) => [r.reportId, r.reasons]));
  for (const pub of withSocial) pub.rankReasons = reasonsByReport.get(pub.id);

  void recordRankingImpressions({
    sessionId,
    userId,
    surface: "feed",
    rows: ranked.map((r, i) => ({
      videoId: r.videoId,
      reportId: r.reportId,
      analystId: r.analystId,
      position: i,
      score: r.score,
      reasons: r.reasons,
    })),
  });

  if (withSocial.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[var(--w-standard)]">
        <EmptyState
          icon={<Clapperboard size={32} />}
          title="Nothing to watch yet"
          body="Analysts are still recording. Once a publication carries a clip it appears here."
          action={
            <Link href="/explore" className={buttonClass("ghost", "md")}>
              Open Explore
            </Link>
          }
        />
      </div>
    );
  }

  const startIndex = at ? Math.max(0, withSocial.findIndex((p) => p.id === at)) : 0;

  if (!userId) {
    return (
      <div className="breakout-main breakout-under-tabs h-full min-h-0">
        <VisitorFeed publications={withSocial} startIndex={startIndex} />
      </div>
    );
  }

  return (
    // The Feed is the viewport. This cancels the app layout's gutter and vertical
    // padding so the stage is measured against the window, not against a column,
    // and the tab-bar clearance too: the clip runs underneath the floating pill
    // and the caption block pads itself clear of it.
    <div className="breakout-main breakout-under-tabs h-full min-h-0">
      <FeedSurface
        publications={withSocial}
        startIndex={startIndex}
        canAct
        onPost={postFeedComment}
        sessionId={sessionId}
      />
    </div>
  );
}
