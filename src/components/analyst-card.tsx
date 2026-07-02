import Link from "next/link";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/design/cn";
import { compact } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { computeTier } from "@/lib/engine/score";
import { Avatar } from "./ui/avatar";
import { TierBadge } from "./ui/tier-badge";
import { MoatBadge } from "./ui/moat-badge";
import { Sparkline } from "./charts/sparkline";

export function AnalystCard({
  analyst,
  spark,
  resolvedCalls = 0,
  className,
}: {
  analyst: Profile;
  spark?: number[];
  resolvedCalls?: number;
  className?: string;
}) {
  const tier = computeTier(analyst.score, resolvedCalls);
  return (
    <Link
      href={`/analyst/${analyst.handle}`}
      className={cn(
        "group flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-border-strong",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={analyst.avatar_url} name={analyst.display_name} size="lg" />
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 font-semibold leading-tight">
              {analyst.display_name}
              {analyst.verified && (
                <SealCheck size={15} weight="fill" className="text-accent" />
              )}
            </span>
            <span className="t-meta">@{analyst.handle}</span>
          </div>
        </div>
        <MoatBadge
          handle={analyst.handle}
          score={analyst.score || null}
          sampleSize={resolvedCalls}
          size="sm"
          linked={false}
        />
      </div>

      {analyst.headline && (
        <p className="t-meta line-clamp-2 text-text-mute">{analyst.headline}</p>
      )}

      <div className="flex items-end justify-between">
        <TierBadge tier={tier.key} label={tier.label} />
        {spark && spark.length > 1 ? (
          <Sparkline data={spark} width={96} height={28} />
        ) : (
          <span className="t-meta num">{compact(analyst.followers_count)} followers</span>
        )}
      </div>
    </Link>
  );
}
