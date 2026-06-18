import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ChatCircle,
  Heart,
  LockSimple,
  SealCheck,
  Eye,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/design/cn";
import { compact, analystRating } from "@/lib/format";
import type { Report } from "@/lib/types";
import { Avatar } from "./ui/avatar";
import { Tag } from "./ui/tag";
import { PredictionCard } from "./prediction-card";

const typeLabel: Record<Report["type"], string> = {
  research: "Research",
  call: "Call",
  short_post: "Post",
};

export function ReportCard({ report }: { report: Report }) {
  const author = report.author;
  const when = report.published_at ?? report.created_at;
  const locked = report.access !== "free";

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-[border-color] hover:border-border-strong">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={author ? `/analyst/${author.handle}` : "#"}
          className="flex items-center gap-3"
        >
          <Avatar src={author?.avatar_url} name={author?.display_name ?? "Analyst"} size="md" />
          <div className="flex flex-col leading-tight">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              {author?.display_name ?? "Analyst"}
              {author?.verified && <SealCheck size={13} weight="fill" className="text-accent" />}
            </span>
            <span className="t-meta">
              @{author?.handle} · {formatDistanceToNow(new Date(when), { addSuffix: true })}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {author && (
            <span className="num text-sm font-semibold text-text-mute" title="Analyst rating">
              {analystRating(author)}
            </span>
          )}
          <Tag>{typeLabel[report.type]}</Tag>
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
          <PredictionCard prediction={report.prediction} />
        </Link>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-4 text-text-faint">
          <span className="inline-flex items-center gap-1 text-sm">
            <Heart size={15} /> <span className="num">{compact(report.likes)}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm">
            <ChatCircle size={15} /> <span className="num">{compact(report.comment_count)}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm">
            <Eye size={15} /> <span className="num">{compact(report.views)}</span>
          </span>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
            <LockSimple size={13} weight="bold" />
            {report.access === "paid" ? "Pay-per-report" : "Subscribers"}
          </span>
        )}
      </div>
    </article>
  );
}
