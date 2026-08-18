import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { BadgeCheck, Eye } from "lucide-react";
import { compact } from "@/lib/format";
import { PaywallGate } from "@/components/ui/paywall-gate";
import { ReportSchema } from "@/components/seo/ReportSchema";
import { getReport } from "@/lib/db/reports";
import { analyzeChartBody } from "@/lib/reports/chart-screenshots";
import { listComments } from "@/lib/db/comments";
import { getSessionUserId } from "@/lib/db/auth";
import { hasUnlocked, isSubscribed, hasLiked, hasSaved } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { Avatar } from "@/components/ui/avatar";
import { TickerChip } from "@/components/ui/ticker-chip";
import { Tag } from "@/components/ui/tag";
import { PredictionCard } from "@/components/prediction-card";
import { DisclosureBlock } from "@/components/ui/disclosure-block";
import { DyorBar } from "@/components/ui/dyor-bar";
import { ReportActions } from "@/components/report/report-actions";
import { ShareMenu } from "@/components/share/share-menu";
import { CommentsSection } from "@/components/report/comments-section";
import { ReportBody } from "@/components/editor/report-body";
import { FactCheckLayer } from "@/components/report/fact-check-layer";
import { AudioBrief } from "@/components/report/audio-brief";
import { PriceAttestationSection } from "@/components/report/price-attestation-section";
import type { FactCheckResult } from "@/lib/ai/fact-check";
import { ViewTracker } from "@/components/report/view-tracker";
import { BuyReportButton } from "@/components/wallet/buy-report-button";
import { SubscribeButton } from "@/components/wallet/subscribe-button";

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
  const report = await getReport(id);
  if (!report) notFound();
  const author = report.author;

  const userId = await getSessionUserId();
  const isAuthor = userId === report.author_id;

  const [unlocked, subscribed, liked, saved, wallet, comments] = await Promise.all([
    userId && report.access === "paid" ? hasUnlocked(userId, id) : Promise.resolve(false),
    userId && report.access === "subscribers"
      ? isSubscribed(userId, report.author_id)
      : Promise.resolve(false),
    userId ? hasLiked(userId, id) : Promise.resolve(false),
    userId ? hasSaved(userId, id) : Promise.resolve(false),
    userId ? getWallet(userId) : Promise.resolve(null),
    listComments(id),
  ]);

  const canRead =
    report.access === "free" || isAuthor || unlocked || subscribed;
  const reportPrice = report.price ?? author?.report_price ?? 0;
  const factCheck = report.fact_check_results as unknown as FactCheckResult | null;
  const claims = factCheck?.claims ?? [];

  return (
    <article className="mx-auto max-w-6xl">
      {/* Scroll-scrubbed, like a scrollbar -- reading position, not animation,
        * so the frequency rule does not apply. Hidden without scroll-timeline
        * support and under reduced motion it still just mirrors scroll. */}
      <div className="reading-progress" aria-hidden />
      <ReportSchema report={report} />
      <ViewTracker reportId={id} />

      <div className="flex flex-wrap items-center gap-3">
        <Tag>{report.type === "short_post" ? "Post" : report.type === "call" ? "Call" : "Research"}</Tag>
        {report.ticker && <TickerChip ticker={report.ticker} />}
        <span className="t-meta">
          {formatDistanceToNow(new Date(report.published_at ?? report.created_at), { addSuffix: true })}
        </span>
        <span className="t-meta inline-flex items-center gap-1.5" title="Views">
          <Eye size={14} aria-hidden className="text-text-faint" />
          <span className="num">{compact(report.views)}</span>
          <span className="text-text-faint">views</span>
        </span>
      </div>

      {report.title && <h1 className="t-h1 mt-3">{report.title}</h1>}
      {report.summary && <p className="t-body mt-3 text-lg">{report.summary}</p>}

      {author && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
          <div className="flex items-center gap-3">
            <Link href={`/analyst/${author.handle}`} className="flex items-center gap-3 focus-ring rounded-[var(--radius-btn)]">
              <Avatar src={author.avatar_url} name={author.display_name} size="md" />
              <div className="leading-tight">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {author.display_name}
                  {author.verified && <BadgeCheck size={13} className="text-accent" />}
                </span>
                <span className="t-meta">@{author.handle}</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ReportActions
              reportId={id}
              initialLikes={report.likes}
              initialLiked={liked}
              initialSaved={saved}
              isAuthed={Boolean(userId)}
            />
            <ShareMenu
              target={{
                url: `/report/${id}`,
                title: report.title ?? "Research on Stoa",
                ticker: report.ticker ?? undefined,
              }}
            />
          </div>
        </div>
      )}

      {/* Trust rail stacks above the body on mobile; sticky sidebar on desktop. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <aside className="order-1 flex flex-col gap-4 lg:order-2 lg:sticky lg:top-20 lg:self-start">
          {report.prediction && (
            <PredictionCard
              prediction={report.prediction}
              hideTarget={!canRead}
              pendingReview={report.status === "resolution_pending_review"}
            />
          )}
          {report.prediction && report.ticker && canRead && (
            <PriceAttestationSection ticker={report.ticker} />
          )}
          <DisclosureBlock
            holdsPosition={report.position_held ?? false}
            compensationTied={report.compensation_tied ?? false}
            compensationDetail={report.compensation_detail ?? undefined}
          />
          <DyorBar />
          {claims.length > 0 && (
            <FactCheckLayer
              claims={claims}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-3 t-meta"
            />
          )}
        </aside>

        <div className="order-2 min-w-0 lg:order-1">
          {canRead ? (
            <>
              <AudioBrief reportId={id} isAuthor={isAuthor} />
              <ReportBody
                body={report.body}
                claims={claims}
                isAuthed={Boolean(userId)}
                reportId={id}
              />
            </>
          ) : (
            <Paywall
              access={report.access}
              reportId={id}
              price={reportPrice}
              authorHandle={author?.handle ?? ""}
              authorId={report.author_id}
              subPrice={author?.sub_price ?? null}
              balance={wallet?.balance ?? 0}
              isAuthed={Boolean(userId)}
              subscribed={subscribed}
            />
          )}

          <CommentsSection reportId={id} comments={comments} isAuthed={Boolean(userId)} />
        </div>
      </div>
    </article>
  );
}

function Paywall({
  access,
  reportId,
  price,
  authorHandle,
  authorId,
  subPrice,
  balance,
  isAuthed,
  subscribed,
}: {
  access: "subscribers" | "paid" | "free";
  reportId: string;
  price: number;
  authorHandle: string;
  authorId: string;
  subPrice: number | null;
  balance: number;
  isAuthed: boolean;
  subscribed: boolean;
}) {
  // access is a single exclusive mode today (see BACKEND_DATA_CONTRACTS.md) --
  // showing both CTAs would offer a subscribe path that wouldn't actually
  // unlock a per-report-priced piece, so only the real path renders.
  const unlockButton =
    access === "paid" ? (
      <BuyReportButton
        reportId={reportId}
        price={price}
        balance={balance}
        isAuthed={isAuthed}
        authorHandle={authorHandle}
      />
    ) : null;

  const subscribeButton =
    access === "subscribers" ? (
      <SubscribeButton
        analystId={authorId}
        handle={authorHandle}
        price={subPrice}
        balance={balance}
        isAuthed={isAuthed}
        subscribed={subscribed}
      />
    ) : null;

  return (
    <PaywallGate
      onUnlock={unlockButton}
      onSubscribe={subscribeButton}
      isAuthed={isAuthed}
      loginHref="/sign-in"
    />
  );
}
