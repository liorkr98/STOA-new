import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Heart, Lock, Eye, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { compact } from "@/lib/format";
import { publicTypeLabel } from "@/lib/compose/modes";
import type { Report } from "@/lib/types";
import { Avatar } from "./ui/avatar";
import { EditedFlag } from "./report/edited-flag";
import { Tag } from "./ui/tag";
import { PredictionCard } from "./prediction-card";

export function ReportCard({
  report,
  promoted = false,
  editedAt = null,
}: {
  report: Report;
  promoted?: boolean;
  /** When this publication was last edited, if it ever was. */
  editedAt?: string | null;
}) {
  const author = report.author;
  const when = report.published_at ?? report.created_at;
  const locked = report.access !== "free";
  const pendingReview = report.status === "resolution_pending_review";

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-colors duration-[var(--dur-1)] ease-[var(--ease-hover)] hover:border-border-strong">
      {promoted && (
        <p className="t-meta mb-2 text-[10px] font-medium uppercase tracking-wide text-accent">Promoted</p>
      )}
      <div className="flex items-center justify-between gap-3">
        {author ? (
          <Link href={`/analyst/${author.handle}`} className="flex items-center gap-3">
            <Avatar src={author.avatar_url} name={author.display_name} size="md" />
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {author.display_name}
                {author.verified && <BadgeCheck size={13} className="text-accent" aria-label="Verified" />}
              </span>
              <span className="t-meta flex items-center gap-1.5">
                <span>
                  @{author.handle} · {formatDistanceToNow(new Date(when), { addSuffix: true })}
                </span>
                {editedAt ? <EditedFlag editedAt={editedAt} /> : null}
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar src={null} name="Analyst" size="md" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Analyst</span>
              <span className="t-meta">
                {formatDistanceToNow(new Date(when), { addSuffix: true })}
              </span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Tag>{publicTypeLabel(report.type)}</Tag>
        </div>
      </div>

      <Link href={`/report/${report.id}`} className="mt-4 block">
        {report.title && <h3 className="t-h3">{report.title}</h3>}
        {report.summary && (
          <p className={cn("t-body mt-2", report.type === "short_post" && "text-text")}>
            {report.summary}
          </p>
        )}
      </Link>

      {report.prediction && (
        <Link href={`/report/${report.id}`} className="mt-4 block">
          <PredictionCard prediction={report.prediction} hideTarget={locked} pendingReview={pendingReview} />
        </Link>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-4 text-text-faint">
          <span className="inline-flex items-center gap-1 text-sm">
            <Heart size={15} aria-hidden /> <span className="num">{compact(report.likes)}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm">
            <MessageCircle size={15} aria-hidden /> <span className="num">{compact(report.comment_count)}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm">
            <Eye size={15} aria-hidden /> <span className="num">{compact(report.views)}</span>
          </span>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
            <Lock size={13} aria-hidden />
            {report.access === "paid" ? "Pay-per-report" : "Subscribers"}
          </span>
        )}
      </div>
    </article>
  );
}
