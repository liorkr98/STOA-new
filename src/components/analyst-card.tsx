import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { compact } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { Avatar } from "./ui/avatar";
import { TrackScoreBadge } from "./ui/track-score-badge";
import { Sparkline } from "./charts/sparkline";

export function AnalystCard({
  analyst,
  spark,
  resolvedCalls = 0,
  promoted = false,
  className,
}: {
  analyst: Profile;
  spark?: number[];
  resolvedCalls?: number;
  promoted?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={`/analyst/${analyst.handle}`}
      className={cn(
        "group flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-[transform,border-color] duration-[var(--dur-1)] ease-[var(--ease-hover)] hover:-translate-y-px hover:border-border-strong",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar src={analyst.avatar_url} name={analyst.display_name} size="lg" />
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 font-semibold leading-tight">
              {analyst.display_name}
              {analyst.verified && (
                <BadgeCheck size={15} className="text-accent" aria-label="Verified" />
              )}
            </span>
            <span className="t-meta">@{analyst.handle}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {promoted && (
            <span className="rounded-[var(--radius-tag)] bg-accent-weak px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
              Promoted
            </span>
          )}
          <TrackScoreBadge
          handle={analyst.handle}
          score={analyst.score || null}
          sampleSize={resolvedCalls}
          size="sm"
          linked={false}
        />
        </div>
      </div>

      {analyst.headline && (
        <p className="t-meta line-clamp-2 text-text-mute">{analyst.headline}</p>
      )}

      <div className="flex items-end justify-between">
        <span className="t-meta num">{compact(analyst.followers_count)} followers</span>
        {spark && spark.length > 1 && <Sparkline data={spark} width={96} height={28} />}
      </div>
    </Link>
  );
}
