import { TierBadge } from "@/components/ui/tier-badge";
import { tierProgress } from "@/lib/engine/score";

interface Breakdown {
  winRate: number;
  profitFactor: number;
  alpha: number | null;
  consistency: number;
}

function Bar({ label, value }: { label: string; value: number | null }) {
  const pctVal = value == null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="t-meta">{label}</span>
        <span className="num text-sm font-medium">{value == null ? "—" : `${Math.round(value)}`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${pctVal}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Surfaces the scoring engine's pillar breakdown, outcome counts, and progress
 * toward the next tier. Mirrors the public methodology so the score is legible.
 */
export function TrackBreakdown({
  score,
  breakdown,
  hits,
  nearHits,
  misses,
  total,
}: {
  score: number;
  breakdown: Breakdown;
  hits: number;
  nearHits: number;
  misses: number;
  total: number;
}) {
  const progress = tierProgress(score, total);

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="t-h3">Score breakdown</h2>
        <span className="num text-sm text-text-mute">{score} / 100</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Bar label="Win rate (Wilson)" value={breakdown.winRate} />
        <Bar label="Profit factor" value={breakdown.profitFactor} />
        <Bar label="Alpha vs S&P" value={breakdown.alpha} />
        <Bar label="Consistency" value={breakdown.consistency} />
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
        <div>
          <p className="num text-xl font-semibold text-[var(--up)]">{hits}</p>
          <p className="t-eyebrow mt-0.5">Hits</p>
        </div>
        <div>
          <p className="num text-xl font-semibold text-text-mute">{nearHits}</p>
          <p className="t-eyebrow mt-0.5">Near</p>
        </div>
        <div>
          <p className="num text-xl font-semibold text-[var(--down)]">{misses}</p>
          <p className="t-eyebrow mt-0.5">Miss</p>
        </div>
      </div>

      {progress.next ? (
        <div className="border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="t-meta">Progress to next tier</span>
            <TierBadge tier={progress.next.key} label={progress.next.label} />
          </div>
          <ul className="flex flex-col gap-2">
            {progress.requirements.map((r) => (
              <li key={r.label} className="flex items-center justify-between text-sm">
                <span className="text-text-mute">{r.label}</span>
                <span className={r.met ? "num text-[var(--up)]" : "num text-text"}>
                  {Math.round(r.current)} / {r.required}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : total > 0 ? (
        <p className="t-meta border-t border-border pt-4">Top tier reached. Keep it up.</p>
      ) : null}
    </div>
  );
}
