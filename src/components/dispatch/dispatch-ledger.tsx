import Link from "next/link";
import { SealStamp } from "@/components/ui/seal-stamp";
import type { DispatchLedgerRow } from "@/lib/dispatch/types";

function OutcomeBadge({ outcome, resolvedAt }: { outcome: DispatchLedgerRow["outcome"]; resolvedAt: string }) {
  const date = new Date(resolvedAt);
  if (outcome === "hit") return <SealStamp status="hit" date={date} size="sm" />;
  if (outcome === "miss") return <SealStamp status="miss" date={date} size="sm" />;
  return (
    <span className="num text-[10px] font-semibold uppercase tracking-wider text-text-mute">
      {outcome}
    </span>
  );
}

function callSummary(row: DispatchLedgerRow) {
  const parts: string[] = [];
  if (row.targetPrice != null) parts.push(`Target $${row.targetPrice.toFixed(2)}`);
  if (row.resolvedPrice != null) parts.push(`Closed $${row.resolvedPrice.toFixed(2)}`);
  return parts.join(" · ") || "—";
}

export function DispatchLedger({ items }: { items: DispatchLedgerRow[] }) {
  if (items.length === 0) return null;

  return (
    <section className="dispatch-section">
      <h2 className="dispatch-section-label">Today&apos;s Record</h2>
      <div className="overflow-x-auto">
        <table className="dispatch-ledger w-full text-sm">
          <thead>
            <tr className="border-border border-b text-left text-text-faint text-xs uppercase tracking-wider">
              <th className="pb-2 pr-4 font-medium">Analyst</th>
              <th className="pb-2 pr-4 font-medium">Ticker</th>
              <th className="pb-2 pr-4 font-medium">Call</th>
              <th className="pb-2 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.reportId}-${item.resolvedAt}`} className="border-border/60 border-b last:border-0">
                <td className="py-3 pr-4">
                  <Link href={`/analyst/${item.authorHandle}`} className="font-medium hover:text-accent">
                    {item.authorName}
                  </Link>
                </td>
                <td className="num py-3 pr-4 text-xs uppercase">{item.ticker}</td>
                <td className="py-3 pr-4 text-text-mute text-xs">{callSummary(item)}</td>
                <td className="py-3">
                  <OutcomeBadge outcome={item.outcome} resolvedAt={item.resolvedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
