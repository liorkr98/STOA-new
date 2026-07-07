import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { MoatBadge } from "@/components/ui/moat-badge";
import type { DispatchLeaderboardEntry } from "@/lib/dispatch/types";

export function DispatchLeaderboard({ entries }: { entries: DispatchLeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="dispatch-section">
      <h2 className="dispatch-section-label">Top creators this week</h2>
      <ol className="space-y-0 divide-y divide-border">
        {entries.map((entry, index) => (
          <li
            key={entry.analyst.id}
            className="flex items-center justify-between gap-4 py-3 first:pt-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="num w-6 shrink-0 text-text-faint text-xs tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Link
                href={`/analyst/${entry.analyst.handle}`}
                className="flex min-w-0 items-center gap-2.5 focus-ring rounded-[var(--r-btn)]"
              >
                <Avatar src={entry.analyst.avatar_url} name={entry.analyst.display_name} size="sm" />
                <span className="truncate font-medium">{entry.analyst.display_name}</span>
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <MoatBadge handle={entry.analyst.handle} score={entry.analyst.score || null} size="sm" />
              <span className="num hidden text-text-faint text-xs sm:inline">
                {entry.resolvedCalls} resolved
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
