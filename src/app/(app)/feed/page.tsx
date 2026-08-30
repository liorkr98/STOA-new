import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { FeedSurface } from "@/components/feed/feed-surface";
import { clipsToPublications } from "@/lib/feed/build-publications";
import { listCommentsForReports } from "@/lib/db/comments";
import { postFeedComment } from "@/app/actions/feed";
import { listVideoClipCards } from "@/lib/db/video-clips";
import { getSessionUserId } from "@/lib/db/auth";
import { recordRankingImpressions } from "@/lib/db/ranking";
import { loadViewerContext } from "@/lib/ranking/context";
import { rankClips } from "@/lib/ranking/rank";
import type { FeedComment } from "@/lib/feed/types";

export const metadata: Metadata = { title: "Feed" };

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
 * watchlist, recency; MOAT is a light gate). Not recency alone.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const sessionId = crypto.randomUUID();
  const [atParams, userId, clips, viewer] = await Promise.all([
    searchParams,
    getSessionUserId(),
    listVideoClipCards(72),
    loadViewerContext(),
  ]);
  const { at } = atParams;

  const ranked = await rankClips(clips, viewer, "feed");
  const publications = ranked.length > 0 ? await clipsToPublications(ranked.map((r) => r.item)) : [];
  const reasonsByReport = new Map(ranked.map((r) => [r.reportId, r.reasons]));
  for (const pub of publications) pub.rankReasons = reasonsByReport.get(pub.id);

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

  if (publications.length > 0) {
    const commentsByReport = await listCommentsForReports(publications.map((p) => p.id));
    for (const pub of publications) {
      const authorHandle = pub.analyst.handle;
      pub.comments = (commentsByReport.get(pub.id) ?? []).map(
        (c): FeedComment => ({
          id: c.id,
          parentId: c.parent_id ?? null,
          author: {
            handle: c.author?.handle ?? "",
            displayName: c.author?.display_name ?? "Reader",
            avatarUrl: c.author?.avatar_url ?? null,
            isAuthor: c.author?.handle === authorHandle,
          },
          createdAt: c.created_at,
          text: c.body,
          likes: c.likes ?? 0,
        }),
      );
    }
  }

  if (publications.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[var(--w-standard)]">
        <EmptyState
          icon={<Clapperboard size={32} />}
          title="Nothing to watch yet"
          body="Analysts are still recording. Once a publication carries a clip it appears here."
          action={
            <Link href="/explore" className={buttonClass("secondary", "md")}>
              Open Explore
            </Link>
          }
        />
      </div>
    );
  }

  const startIndex = at ? Math.max(0, publications.findIndex((p) => p.id === at)) : 0;

  return (
    // The Feed is the viewport. This cancels the app layout's gutter and vertical
    // padding so the stage is measured against the window, not against a column.
    <div className="breakout-main h-full min-h-0">
      <FeedSurface
        publications={publications}
        startIndex={startIndex}
        canAct={Boolean(userId)}
        onPost={userId ? postFeedComment : undefined}
        sessionId={sessionId}
      />
    </div>
  );
}
