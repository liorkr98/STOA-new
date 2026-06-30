import type { Metadata } from "next";
import Link from "next/link";
import { GradeTag } from "@/components/ui/tag";
import { TierBadge } from "@/components/ui/tier-badge";
import { TIERS } from "@/lib/engine/score";

export const metadata: Metadata = {
  title: "Scoring methodology",
  description: "How Stoa grades analyst calls and computes the public 600-1400 rating.",
};

export default function ScoringPage() {
  return (
    <article className="mx-auto max-w-3xl flex flex-col gap-10 py-4">
      <header>
        <p className="t-eyebrow">Transparency</p>
        <h1 className="t-display mt-2 text-4xl">How scoring works</h1>
        <p className="t-body mt-4 text-lg">
          Every call on Stoa is graded by the market, not by us. The score is math on locked entry
          prices, resolved outcomes, and benchmark alpha. No manual edits. No reputation votes.
        </p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">The loop</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-text-mute">
          <li>An analyst publishes a call with ticker, direction, optional target, and horizon.</li>
          <li>Stoa locks the entry price from the live feed and captures SPY as the benchmark.</li>
          <li>When the horizon ends, the grading job fetches resolved prices and assigns an outcome.</li>
          <li>The composite score and public 600-1400 rating update on the analyst profile.</li>
        </ol>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">Outcomes</h2>
        <div className="mt-4 flex flex-col gap-3">
          {(
            [
              { outcome: "hit" as const, text: "Moved with the call and reached target (or +5% if no target)." },
              { outcome: "near" as const, text: "Moved with the call but fell short of target." },
              { outcome: "partial" as const, text: "Roughly flat within the neutral band." },
              { outcome: "miss" as const, text: "Moved against the stated direction." },
              { outcome: "open" as const, text: "Still within the published horizon." },
            ] as const
          ).map((row) => (
            <div key={row.outcome} className="flex items-start gap-3 text-sm">
              <GradeTag outcome={row.outcome} />
              <span className="text-text-mute">{row.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">Composite score (0-100)</h2>
        <ul className="mt-4 space-y-3 text-sm text-text-mute">
          <li>
            <strong className="text-text">Win rate</strong> — Wilson lower bound on time-weighted
            outcomes (recent calls count more).
          </li>
          <li>
            <strong className="text-text">Profit factor</strong> — decay-weighted average win divided
            by average loss.
          </li>
          <li>
            <strong className="text-text">Alpha</strong> — excess return vs SPY over the same window
            (needs at least five benchmarked calls).
          </li>
          <li>
            <strong className="text-text">Consistency</strong> — penalties for miss streaks and
            outcome drawdowns.
          </li>
        </ul>
        <p className="t-meta mt-4">
          The public rating maps linearly: 0 → 600, 100 → 1400.
        </p>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">Tiers</h2>
        <div className="mt-4 flex flex-col gap-3">
          {TIERS.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TierBadge tier={t.key} label={t.label} />
                <span className="text-text-mute">{t.minCalls}+ resolved calls</span>
              </div>
              <span className="num text-text-mute">score {t.minScore}+</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">What we deliberately ignore</h2>
        <p className="t-body mt-3">
          Firm prestige, follower count, media appearances, and self-reported win rates. Only verified
          calls that went through the lock-and-grade pipeline count.
        </p>
        <p className="t-meta mt-4">
          Short posts do not feed the track record. Only research and calls do.
        </p>
      </section>

      <p className="t-meta">
        Also see{" "}
        <Link href="/how-it-works" className="text-accent hover:underline">
          How it works
        </Link>{" "}
        for the investor-facing overview.
      </p>
    </article>
  );
}
