import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { ScoreRing } from "@/components/ui/score-ring";
import { TickerChip } from "@/components/ui/ticker-chip";
import { DirectionTag } from "@/components/ui/tag";
import { SealStamp, type SealStatus } from "@/components/ui/seal-stamp";
import { TodayBand } from "@/components/today/today-band";
import { price } from "@/lib/format";
import type { TodayVerdict } from "@/lib/today/types";

function sealFor(outcome: TodayVerdict["outcome"]): SealStatus {
  if (outcome === "hit") return "hit";
  if (outcome === "miss") return "miss";
  return "near";
}

/**
 * Verdicts. Resolved calls, graded by the market, never behind a paywall.
 * This band is also the best page Stoa has for someone who has never heard of
 * it, so it carries its own explainer and assumes no prior context: a stranger
 * should be able to read one row and understand the whole trust mechanic.
 */
export function TodayVerdicts({ verdicts }: { verdicts: TodayVerdict[] }) {
  if (verdicts.length === 0) return null;

  return (
    <TodayBand
      title="Verdicts"
      note="Calls the market just graded, from across Stoa."
      badge={<span className="today-band-badge">Always free</span>}
      seeAllHref="/leaderboard"
      seeAllLabel="All verdicts"
    >
      <div className="mt-2">
        {verdicts.map((v) => (
          <VerdictRow key={`${v.reportId}-${v.ticker}`} verdict={v} />
        ))}
      </div>

      <p className="today-explainer">
        Analysts on Stoa publish calls with an entry price and a target locked at publication. When
        the market resolves one, it is graded a hit or a miss and added to their public track
        score. No paywall, ever.
      </p>
      <p className="mt-2">
        <Link href="/scoring" className="today-see-all focus-ring">
          How scoring works
          <span aria-hidden> →</span>
        </Link>
      </p>
    </TodayBand>
  );
}

function VerdictRow({ verdict }: { verdict: TodayVerdict }) {
  const { returnPct } = verdict;
  const returnColor =
    returnPct == null ? "var(--text-mute)" : returnPct >= 0 ? "var(--up)" : "var(--down)";

  return (
    <article className="today-verdict">
      <SealStamp
        status={sealFor(verdict.outcome)}
        date={new Date(verdict.resolvedAt)}
        size="md"
        animateOnView
      />

      <div className="min-w-0">
        <div className="today-meta">
          <TickerChip ticker={verdict.ticker} href={`/markets/${verdict.ticker}`} />
          <DirectionTag direction={verdict.direction} />
        </div>

        <Link
          href={`/report/${verdict.reportId}`}
          className="group focus-ring block rounded-[var(--radius-btn)]"
        >
          <h4 className="today-headline">{verdict.headline}</h4>
        </Link>

        <p className="today-verdict-prices">
          <span>{price(verdict.entryPrice)}</span>
          <span className="today-verdict-arrow" aria-label="resolved to">
            →
          </span>
          <span>{verdict.exitPrice == null ? "-" : price(verdict.exitPrice)}</span>
          {returnPct != null ? (
            <span style={{ color: returnColor }} className="font-semibold">
              {returnPct >= 0 ? "+" : ""}
              {returnPct.toFixed(1)}%
            </span>
          ) : null}
        </p>

        <div className="today-byline">
          <Link
            href={`/analyst/${verdict.author.handle}`}
            className="focus-ring inline-flex items-center gap-2.5 rounded-[var(--radius-btn)]"
          >
            <Avatar src={verdict.author.avatarUrl} name={verdict.author.displayName} size="sm" />
            <span className="text-[0.8125rem] font-semibold text-text">
              {verdict.author.displayName}
            </span>
          </Link>
          <ScoreRing
            score={verdict.author.score}
            size="sm"
            provisional={verdict.author.provisional}
          />
        </div>
      </div>
    </article>
  );
}
