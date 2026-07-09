import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByHandle, listTopAnalysts } from "@/lib/db/profiles";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { analystStats } from "@/lib/engine/track";
import { price, pct } from "@/lib/format";
import { TrackScoreBadge } from "@/components/ui/track-score-badge";
import { TrackChart } from "@/components/charts/track-chart";
import { TrackBreakdown } from "@/components/track/track-breakdown";
import { StatusChip } from "@/components/ui/status-chip";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  return {
    title: profile ? `${profile.display_name} · Track Score` : "Track Score",
  };
}

function percentile(score: number, allScores: number[]) {
  if (allScores.length === 0) return null;
  const below = allScores.filter((s) => s < score).length;
  return Math.round((below / allScores.length) * 100);
}

export default async function TrackScoreAnalyticsPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const [predictions, pool] = await Promise.all([
    listPredictionsByAuthor(profile.id),
    listTopAnalysts(500),
  ]);
  const stats = analystStats(predictions);

  const allScores = pool.map((a) => a.score);
  const overallPct = percentile(stats.score, allScores);

  const primarySpecialty = profile.profile_config?.specialties?.[0];
  const sectorPct = primarySpecialty
    ? percentile(
        stats.score,
        pool
          .filter((a) => a.profile_config?.specialties?.includes(primarySpecialty))
          .map((a) => a.score),
      )
    : null;

  const resolved = predictions
    .filter((p) => p.outcome !== "open")
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={`/analyst/${profile.handle}`} className="t-meta hover:text-text">
          &larr; {profile.display_name}
        </Link>
        <h1 className="t-h1 mt-2">Track Score</h1>
        <p className="t-body mt-1">
          The full breakdown behind the score shown on {profile.display_name}&apos;s profile.
        </p>
      </div>

      <TrackScoreBadge
        handle={profile.handle}
        score={stats.score || null}
        hitRate={stats.winRate}
        sampleSize={stats.resolved}
        size="lg"
        linked={false}
      />

      {(overallPct != null || sectorPct != null) && (
        <div className="flex flex-wrap gap-6">
          {overallPct != null && (
            <div>
              <p className="num text-2xl font-semibold">Top {100 - overallPct}%</p>
              <p className="t-meta">of all creators</p>
            </div>
          )}
          {sectorPct != null && primarySpecialty && (
            <div>
              <p className="num text-2xl font-semibold">Top {100 - sectorPct}%</p>
              <p className="t-meta">of {primarySpecialty} creators</p>
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="t-h3 mb-3">Score history</h2>
        {stats.series.length > 1 ? (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <TrackChart data={stats.series} />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border">
            <p className="t-meta">Score history appears after resolved calls.</p>
          </div>
        )}
      </section>

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

      <section>
        <h2 className="t-h3 mb-3">Per-report performance</h2>
        {resolved.length > 0 ? (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="t-eyebrow px-4 py-3 font-medium">Ticker</th>
                  <th className="t-eyebrow px-4 py-3 font-medium">Target</th>
                  <th className="t-eyebrow px-4 py-3 font-medium">Resolution</th>
                  <th className="t-eyebrow px-4 py-3 text-right font-medium">Return</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="num px-4 py-3 font-medium">{p.ticker}</td>
                    <td className="num px-4 py-3 text-text-mute">
                      {p.target_price ? `$${price(p.target_price)}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={p.outcome === "miss" ? "miss" : "hit"} />
                    </td>
                    <td
                      className="num px-4 py-3 text-right font-medium"
                      style={{ color: (p.return_pct ?? 0) >= 0 ? "var(--verdigris)" : "var(--rust)" }}
                    >
                      {pct(p.return_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="t-meta">No resolved calls yet.</p>
        )}
      </section>

      <Link href="/scoring#track-score" className="t-meta underline hover:no-underline">
        How your score is calculated
      </Link>
    </div>
  );
}
