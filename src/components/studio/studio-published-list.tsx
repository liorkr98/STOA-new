import Link from "next/link";
import { compact } from "@/lib/format";
import type { Plan } from "@/lib/db/plans";
import type { Report } from "@/lib/types";
import { ReportAccessEditor } from "@/components/studio/report-access-editor";
import { PendingReviewTag } from "@/components/ui/tag";

/**
 * Server component: renders markup only. ReportAccessEditor carries its own
 * "use client" for the popover it owns.
 */
export function StudioPublishedList({
  reports,
  plans,
}: {
  reports: Report[];
  plans: Plan[];
}) {
  return (
    <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      {reports.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5 last:border-0"
        >
          <Link href={`/report/${r.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent">
            {r.title || r.summary || "Untitled"}
          </Link>
          <span className="flex shrink-0 items-center gap-2">
            {r.status === "resolution_pending_review" && <PendingReviewTag />}
            <ReportAccessEditor report={r} plans={plans} />
            <span className="t-meta num hidden sm:inline">{compact(r.views)} views</span>
            <span className="t-meta num hidden sm:inline">{compact(r.likes)} likes</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
