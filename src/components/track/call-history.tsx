import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { price, pct } from "@/lib/format";
import type { Prediction } from "@/lib/types";
import { DirectionTag, GradeTag, PendingReviewTag } from "@/components/ui/tag";

/**
 * The full, auditable call ledger: every prediction with entry, resolution,
 * direction-aware return, and alpha vs S&P. This is the transparency moat.
 */
export function CallHistory({ predictions }: { predictions: Prediction[] }) {
  if (predictions.length === 0) return null;

  const sorted = [...predictions].sort((a, b) => {
    if (a.outcome === "open" && b.outcome !== "open") return -1;
    if (a.outcome !== "open" && b.outcome === "open") return 1;
    return +new Date(b.created_at) - +new Date(a.created_at);
  });

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="t-h3">Call history</h2>
        <span className="t-meta">{predictions.length} total</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-border text-left">
              <th className="t-eyebrow px-6 py-2 font-medium">Ticker</th>
              <th className="t-eyebrow px-3 py-2 font-medium">Entry</th>
              <th className="t-eyebrow px-3 py-2 font-medium">Resolved</th>
              <th className="t-eyebrow px-3 py-2 text-right font-medium">Return</th>
              <th className="t-eyebrow px-3 py-2 text-right font-medium">Alpha</th>
              <th className="t-eyebrow px-6 py-2 text-right font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const alpha =
                p.return_pct != null && p.benchmark_pct != null
                  ? p.return_pct - p.benchmark_pct
                  : null;
              const pendingReview = p.report_status === "resolution_pending_review";
              const open = p.outcome === "open" && !pendingReview;
              return (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-surface-2"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/report/${p.report_id}`}
                      className="inline-flex items-center gap-2 hover:text-accent"
                    >
                      <span className="num font-semibold">{p.ticker}</span>
                      <DirectionTag direction={p.direction} />
                    </Link>
                  </td>
                  <td className="num px-3 py-3 text-text-mute">${price(p.lock_price)}</td>
                  <td className="num px-3 py-3 text-text-mute">
                    {p.resolved_price ? (
                      `$${price(p.resolved_price)}`
                    ) : (
                      <span className="t-meta">
                        in {formatDistanceToNow(new Date(p.resolves_at))}
                      </span>
                    )}
                  </td>
                  <td
                    className="num px-3 py-3 text-right"
                    style={{
                      color:
                        p.return_pct == null
                          ? "var(--text-faint)"
                          : p.return_pct >= 0
                            ? "var(--up)"
                            : "var(--down)",
                    }}
                  >
                    {p.return_pct == null ? "-" : pct(p.return_pct)}
                  </td>
                  <td
                    className="num px-3 py-3 text-right"
                    style={{
                      color:
                        alpha == null
                          ? "var(--text-faint)"
                          : alpha >= 0
                            ? "var(--up)"
                            : "var(--down)",
                    }}
                  >
                    {alpha == null ? "-" : pct(alpha)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {pendingReview ? (
                      <PendingReviewTag />
                    ) : (
                      <GradeTag outcome={open ? "open" : p.outcome} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
