import Link from "next/link";
import { SealStamp } from "@/components/ui/seal-stamp";
import { TickerChip } from "@/components/ui/ticker-chip";
import type { DispatchLedgerRow } from "@/lib/dispatch/types";

function OutcomeBadge({
  outcome,
  resolvedAt,
}: {
  outcome: DispatchLedgerRow["outcome"];
  resolvedAt: string;
}) {
  const date = new Date(resolvedAt);
  if (outcome === "hit") return <SealStamp status="hit" date={date} size="sm" />;
  if (outcome === "miss") return <SealStamp status="miss" date={date} size="sm" />;
  return (
    <span className="num text-[10px] font-semibold uppercase tracking-wider text-text-mute">
      {outcome}
    </span>
  );
}

function money(v: number | null) {
  return v == null ? "-" : `$${v.toFixed(2)}`;
}

/**
 * Today's Record: the cycle's resolved calls as a compact ledger table.
 * This is the trust bar -- the actual dated record, not an abstract stat.
 * Renders nothing when the cycle has no resolutions (never an empty ledger).
 */
export function DispatchLedger({ items }: { items: DispatchLedgerRow[] }) {
  if (items.length === 0) return null;

  return (
    <section className="dispatch-section">
      <h2 className="dispatch-kicker">
        <span>Today&apos;s Record</span>
      </h2>
      <div className="mt-5 overflow-x-auto">
        <table className="dispatch-ledger w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border-strong text-left">
              <th className="pb-2.5 pr-4">Analyst</th>
              <th className="pb-2.5 pr-4">Ticker</th>
              <th className="pb-2.5 pr-4">Target</th>
              <th className="pb-2.5 pr-4">Closed</th>
              <th className="pb-2.5 pr-4 text-right">Return</th>
              <th className="pb-2.5 text-right">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={`${item.reportId}-${item.resolvedAt}`}
                className="border-b border-border last:border-0"
              >
                <td className="py-3 pr-4">
                  <Link
                    href={`/analyst/${item.authorHandle}`}
                    className="font-medium hover:text-accent"
                  >
                    {item.authorName}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <TickerChip ticker={item.ticker} />
                </td>
                <td className="num py-3 pr-4 text-xs text-text-mute">{money(item.targetPrice)}</td>
                <td className="num py-3 pr-4 text-xs text-text-mute">
                  {money(item.resolvedPrice)}
                </td>
                <td className="num py-3 pr-4 text-right text-xs font-semibold">
                  {item.returnPct == null ? (
                    <span className="text-text-faint">-</span>
                  ) : (
                    <span
                      style={{ color: item.returnPct >= 0 ? "var(--up)" : "var(--down)" }}
                    >
                      {item.returnPct >= 0 ? "+" : ""}
                      {item.returnPct.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="py-3">
                  <span className="flex justify-end">
                    <OutcomeBadge outcome={item.outcome} resolvedAt={item.resolvedAt} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
