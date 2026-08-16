import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { ScoreRing } from "@/components/ui/score-ring";
import { Band } from "@/components/ui/band";
import type { TodayStanding } from "@/lib/today/types";

/**
 * The Standings. Absorbs the old standalone leaderboard.
 *
 * Two gaps are shown as gaps rather than filled in: the seven-day rank-change
 * arrow needs a stored historical rank (only per-analyst score snapshots
 * exist), and the THIS WEEK / THIS MONTH filter needs per-cycle ranking. The
 * board is therefore all-time, and says so, instead of shipping a control that
 * cannot change anything.
 */
export function TodayStandings({ standings }: { standings: TodayStanding[] }) {
  if (standings.length === 0) return null;

  return (
    <Band
      title="The Standings"
      note="Verified Track Scores, all-time."
      seeAllHref="/leaderboard"
    >
      <div className="today-standings">
        {standings.map((entry) => (
          <StandingRow key={entry.analyst.handle} entry={entry} />
        ))}
      </div>
      <p className="today-gap-note">
        Weekly and monthly cycles, and seven-day rank movement, are not computed yet.
      </p>
    </Band>
  );
}

function StandingRow({ entry }: { entry: TodayStanding }) {
  const { analyst } = entry;
  const stat =
    entry.resolvedCalls === 0
      ? "No resolved calls yet"
      : `${entry.hitRatePct ?? 0}% hit · ${entry.resolvedCalls} resolved`;

  return (
    <div className="today-standing">
      <span className="today-rank num" aria-hidden>
        {String(entry.rank).padStart(2, "0")}
      </span>

      <Link
        href={`/analyst/${analyst.handle}`}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-btn)]"
      >
        <Avatar src={analyst.avatarUrl} name={analyst.displayName} size="sm" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[0.8125rem] font-semibold text-text">
            {analyst.displayName}
          </span>
          <span className="num text-[0.625rem] uppercase tracking-[0.1em] text-text-faint">
            {stat}
          </span>
        </span>
      </Link>

      <ScoreRing score={analyst.score} size="sm" provisional={analyst.provisional} />

      <span
        className="today-pending w-6 text-right"
        title="Rank movement is not tracked yet"
        aria-label="Rank movement not tracked yet"
      >
        -
      </span>
    </div>
  );
}
