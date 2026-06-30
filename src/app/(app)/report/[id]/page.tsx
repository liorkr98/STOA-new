import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { LockSimple, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getReport } from "@/lib/db/reports";
import { listComments } from "@/lib/db/comments";
import { getSessionUserId } from "@/lib/db/auth";
import { hasUnlocked, isSubscribed, hasLiked, hasSaved } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { analystRating } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import { PredictionCard } from "@/components/prediction-card";
import { ReportActions } from "@/components/report/report-actions";
import { CommentsSection } from "@/components/report/comments-section";
import { ReportBody } from "@/components/editor/report-body";
import { FactCheckResults } from "@/components/editor/fact-checker-panel";
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
  return { title: report?.title ?? "Report" };
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

  return (
    <article className="mx-auto max-w-3xl">
      <ViewTracker reportId={id} />

      <div className="flex items-center gap-3">
        <Tag>{report.type === "short_post" ? "Post" : report.type === "call" ? "Call" : "Research"}</Tag>
        {report.ticker && <span className="num text-sm font-semibold text-text-mute">{report.ticker}</span>}
        <span className="t-meta">
          {formatDistanceToNow(new Date(report.published_at ?? report.created_at), { addSuffix: true })}
        </span>
      </div>

      {report.title && <h1 className="t-h1 mt-3">{report.title}</h1>}
      {report.summary && <p className="t-body mt-3 text-lg">{report.summary}</p>}

      {author && (
        <div className="mt-5 flex items-center justify-between border-y border-border py-4">
          <Link href={`/analyst/${author.handle}`} className="flex items-center gap-3">
            <Avatar src={author.avatar_url} name={author.display_name} size="md" />
            <div className="leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {author.display_name}
                {author.verified && <SealCheck size={13} weight="fill" className="text-accent" />}
              </span>
              <span className="t-meta">
                @{author.handle} · Rating <span className="num">{analystRating(author)}</span>
              </span>
            </div>
          </Link>
          <ReportActions
            reportId={id}
            initialLikes={report.likes}
            initialLiked={liked}
            initialSaved={saved}
            isAuthed={Boolean(userId)}
          />
        </div>
      )}

      {report.prediction && (
        <div className="mt-6">
          <PredictionCard prediction={report.prediction} />
        </div>
      )}

      {canRead ? (
        <>
          <ReportBody body={report.body} />
          {report.fact_check_results && (
            <FactCheckResults result={report.fact_check_results as unknown as FactCheckResult} />
          )}
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
  return (
    <div className="mt-8 flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface px-6 py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-weak text-accent">
        <LockSimple size={22} weight="bold" />
      </span>
      <div>
        <h2 className="t-h3">
          {access === "paid" ? "Unlock the full report" : "For subscribers"}
        </h2>
        <p className="t-body mx-auto mt-1 text-center">
          {access === "paid"
            ? "Pay once to read this report. 90% goes straight to the analyst."
            : `Subscribe to @${authorHandle} to read this and everything they publish.`}
        </p>
      </div>
      {access === "paid" ? (
        <BuyReportButton
          reportId={reportId}
          price={price}
          balance={balance}
          isAuthed={isAuthed}
          authorHandle={authorHandle}
        />
      ) : (
        <div className="w-full max-w-xs">
          <SubscribeButton
            analystId={authorId}
            handle={authorHandle}
            price={subPrice}
            balance={balance}
            isAuthed={isAuthed}
            subscribed={subscribed}
          />
        </div>
      )}
    </div>
  );
}
