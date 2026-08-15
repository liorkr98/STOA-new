import type { Metadata } from "next";
import { isThisMonth } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { analystStats } from "@/lib/engine/track";
import { ScoreRing } from "@/components/ui/score-ring";
import { TrackChart } from "@/components/charts/track-chart";
import { TrackBreakdown } from "@/components/track/track-breakdown";
import { CallHistory } from "@/components/track/call-history";

export const metadata: Metadata = { title: "Track record" };

export default async function TrackRecordPage() {
  const profile = (await getSessionProfile())!;
  const predictions = await listPredictionsByAuthor(profile.id);
  const stats = analystStats(predictions);
  const provisional = stats.total < 5;

  const resolvingThisMonth = predictions.filter(
    (p) => p.outcome === "open" && p.resolves_at && isThisMonth(new Date(p.resolves_at)),
  ).length;

  // Weakest of the four pillars (factual, not advisory).
  const pillars: { label: string; value: number }[] = [
    { label: "Win rate", value: stats.breakdown.winRate },
    { label: "Profit factor", value: stats.breakdown.profitFactor },
    { label: "Alpha vs S&P", value: stats.breakdown.alpha ?? 100 },
    { label: "Consistency", value: stats.breakdown.consistency },
  ];
  const weakest = pillars.reduce((a, b) => (b.value < a.value ? b : a));

  const moves: string[] = [];
  if (resolvingThisMonth > 0)
    moves.push(`${resolvingThisMonth} open call${resolvingThisMonth === 1 ? "" : "s"} resolving this month`);
  if (stats.total > 0) moves.push(`${weakest.label} is your weakest component`);
  if (provisional) moves.push(`${Math.max(0, 5 - stats.total)} more resolved calls until the score firms up`);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Track record</h1>
        <p className="t-body mt-2">Your score, and what moves it.</p>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <ScoreRing score={stats.score || null} size="lg" provisional={provisional} />
        <div className="flex gap-7">
          {[
            { label: "HITS", value: stats.hits, tone: "var(--up)" },
            { label: "NEAR", value: stats.nearHits, tone: "var(--text-mute)" },
            { label: "MISS", value: stats.misses, tone: "var(--down)" },
          ].map((c) => (
            <div key={c.label}>
              <div className="text-2xl font-semibold" style={{ color: c.tone }}>{c.value}</div>
              <div className="num mt-1 text-[10px] uppercase tracking-[0.16em] text-text-mute">{c.label}</div>
            </div>
          ))}
        </div>
        <div className="num text-[10.5px] uppercase tracking-[0.14em] text-text-faint">
          {stats.total === 0
            ? "NO RESOLVED CALLS YET"
            : provisional
              ? `PARTIAL SAMPLE · ${stats.total} RESOLVED`
              : `FULL SAMPLE · ${stats.total} RESOLVED`}
        </div>
      </div>

      {stats.series.length > 1 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="num text-[10.5px] uppercase tracking-[0.18em] text-text-mute">
            Equity curve · resolved calls
          </div>
          <div className="mt-3.5">
            <TrackChart data={stats.series} />
          </div>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border">
          <p className="t-meta">Equity curve appears after resolved calls.</p>
        </div>
      )}

      {stats.total > 0 && (
        <TrackBreakdown
          score={stats.score}
          breakdown={stats.breakdown}
          hits={stats.hits}
          nearHits={stats.nearHits}
          misses={stats.misses}
          total={stats.total}
        />
      )}

      {/* Private-only: factual, never advisory. */}
      {moves.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface-2 p-5">
          <div className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">
            What would move your score
          </div>
          {moves.map((m) => (
            <p key={m} className="num text-[12px] text-text-mute">
              {m}
            </p>
          ))}
        </div>
      )}

      <div>
        <p className="t-meta mb-3">All calls, including missed targets, stay visible permanently.</p>
        <CallHistory predictions={predictions} />
      </div>
    </div>
  );
}
