import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReportSchema } from "@/components/seo/ReportSchema";
import { getReport } from "@/lib/db/reports";
import { gatedReadMinutes } from "@/lib/db/report-length";
import { getLiveClipForReport } from "@/lib/video/clip-for-report";
import { getPendingClipForReport } from "@/lib/db/video-clips";
import { listCardsForReport } from "@/lib/db/publication-cards";
import { bunnyEmbedUrl, isBunnyConfigured } from "@/lib/video/bunny";
import { resolveClipPlayback } from "@/lib/demo/clips";
import { readStoredVideoEdit, sealStoredEdit } from "@/lib/compose/overlays";
import { analyzeChartBody } from "@/lib/reports/chart-screenshots";
import { readMinutes } from "@/lib/reports/reading";
import { listComments, listLikedCommentIds } from "@/lib/db/comments";
import { toFeedComment } from "@/lib/feed/comments";
import { getSessionUserId } from "@/lib/db/auth";
import { hasUnlocked, isSubscribed, hasLiked, hasSaved, isFollowing } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { listReportEdits } from "@/lib/db/report-edits";
import { ViewTracker } from "@/components/report/view-tracker";
import { ReportView } from "@/components/report/report-view";
import type { FactCheckResult } from "@/lib/ai/fact-check";
import { publicTypeLabel } from "@/lib/compose/modes";
import { labelCase } from "@/lib/design/label";
import { themeLabel } from "@/lib/tags/taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);
  // The first chart's captured screenshot becomes the link-preview image.
  const firstChartUrl = analyzeChartBody(report?.body).screenshotUrls[0];
  return {
    title: report?.title ?? "Report",
    alternates: { canonical: `/report/${id}` },
    openGraph: {
      title: report?.title ?? "Report",
      description: report?.summary ?? undefined,
      images: firstChartUrl ? [{ url: firstChartUrl, width: 800 }] : [],
    },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [report, userId, edits] = await Promise.all([
    getReport(id),
    getSessionUserId(),
    listReportEdits(id),
  ]);
  if (!report) notFound();
  const author = report.author;
  const isAuthor = userId === report.author_id;

  const [unlocked, subscribed, liked, saved, following, wallet, comments, clip] = await Promise.all([
    userId && report.access === "paid" ? hasUnlocked(userId, id) : Promise.resolve(false),
    userId &&
      (report.access === "subscribers" || (report.access === "paid" && report.members_included))
      ? isSubscribed(userId, report.author_id)
      : Promise.resolve(false),
    userId ? hasLiked(userId, id) : Promise.resolve(false),
    userId ? hasSaved(userId, id) : Promise.resolve(false),
    userId && !isAuthor ? isFollowing(userId, report.author_id) : Promise.resolve(false),
    userId ? getWallet(userId) : Promise.resolve(null),
    listComments(id),
    getLiveClipForReport(id),
  ]);

  /*
    Built here rather than in the client component: bunnyEmbedUrl reads
    server-only env, so the library id must never travel to the browser as
    anything but a finished URL. The embed is only the fallback for a stream
    the browser refuses; the clip normally plays in our own element.
  */
  const clipMedia = clip
    ? resolveClipPlayback({ playbackUrl: clip.playback_url, thumbnailUrl: clip.thumbnail_url, index: 0 })
    : null;
  // No live clip: is one on the way? Publishing locks the report before the
  // upload starts, so for a while the publication is real and its video is
  // not, and that must never read as "no video". A failed clip is the
  // creator's to fix, so only they see it.
  const pendingRaw = clip ? null : await getPendingClipForReport(id);
  const pendingClip = pendingRaw && (pendingRaw.status !== "failed" || isAuthor) ? pendingRaw : null;
  const clipEmbedUrl =
    clip && !clipMedia?.src.endsWith(".mp4") && isBunnyConfigured()
      ? bunnyEmbedUrl(clip.bunny_video_guid, { autoplay: true, muted: false })
      : null;

  const canRead = report.access === "free" || isAuthor || unlocked || subscribed;
  // After the entitlement check, so a reader who may read gets the locked
  // cards open and everyone else gets them sealed.
  const cards = await listCardsForReport(id, { entitled: canRead });
  const factCheck = report.fact_check_results as unknown as FactCheckResult | null;
  const claims = factCheck?.claims ?? [];
  // A gated reader's body never arrives (RLS), so its length is counted on
  // the server and only the number comes back.
  const minutes = canRead ? readMinutes(report.body) : await gatedReadMinutes(id);

  // The headline is resolved the same way ReportSchema and the feed blocks
  // resolve it, so this page can never open with no H1 at all. When the
  // summary has to stand in as the headline it is not also printed as the
  // dek, so a reader never gets one sentence twice.
  const headline = report.title?.trim() || report.summary?.trim() || "Untitled research";
  const dek = report.title?.trim() ? (report.summary?.trim() ?? null) : null;

  const likedIds = userId ? await listLikedCommentIds(userId, comments.map((c) => c.id)) : new Set<string>();
  const discussion = comments.map((c) =>
    toFeedComment(c, { reportAuthorId: report.author_id, viewerId: userId ?? null, likedIds }),
  );
  const analystName = author?.display_name ?? "The analyst";

  return (
    <>
      <ReportSchema report={report} />
      <ViewTracker reportId={id} />
      <ReportView
        data={{
          id,
          archived: report.status === "archived",
          isAuthor,
          isAuthed: Boolean(userId),
          headline,
          dek,
          typeLabel: labelCase(publicTypeLabel(report.type)),
          publishedAt: report.published_at ?? report.created_at,
          views: report.views,
          likes: report.likes,
          liked,
          saved,
          author: author
            ? {
                id: report.author_id,
                handle: author.handle,
                displayName: author.display_name,
                avatarUrl: author.avatar_url,
                verified: Boolean(author.verified),
              }
            : null,
          following,
          ticker: report.ticker,
          stance: report.stance ?? null,
          theme: report.ticker ? null : themeLabel(report),
          edits,
          readMinutes: minutes,
          clip: clip
            ? {
                reportId: id,
                clipId: clip.id,
                embedUrl: clipEmbedUrl,
                playbackUrl: clipMedia?.src ?? null,
                thumbnailUrl: clipMedia?.poster ?? clip.thumbnail_url,
                analystId: report.author_id,
                durationSeconds: clip.duration_seconds,
                analystName,
                edit: sealStoredEdit(readStoredVideoEdit(report.video_edit)),
                ticker: report.ticker,
              }
            : null,
          pendingClip: pendingClip
            ? {
                reportId: id,
                title: report.title ?? undefined,
                status: pendingClip.status,
                startedAt: pendingClip.createdAt,
                analystName,
                isAuthor,
              }
            : null,
          canRead,
          body: canRead ? report.body : null,
          claims,
          cards,
          gate:
            canRead || report.access === "free"
              ? null
              : {
                  reportId: id,
                  access: report.access,
                  membersIncluded: Boolean(report.members_included),
                  price: report.price ?? author?.report_price ?? 0,
                  subPrice: author?.sub_price ?? null,
                  balance: wallet?.balance ?? 0,
                  isAuthed: Boolean(userId),
                  subscribed,
                  authorId: report.author_id,
                  authorHandle: author?.handle ?? "",
                  authorName: analystName,
                  minutesLeft: minutes,
                },
          disclosure: {
            holdsPosition: report.position_held ?? false,
            compensationTied: report.compensation_tied ?? false,
            compensationDetail: report.compensation_detail ?? undefined,
          },
          discussion,
        }}
      />
    </>
  );
}
