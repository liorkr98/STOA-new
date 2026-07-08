import { price as fmtPrice } from "@/lib/format";
import type { AttestedPriceData } from "@/services/price-attestation";

interface PriceAttestationCardProps {
  title?: string;
  loading?: boolean;
  error?: string | null;
  data?: AttestedPriceData | null;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}

export function PriceAttestationCard({
  title = "Price attestation",
  loading = false,
  error = null,
  data = null,
}: PriceAttestationCardProps) {
  return (
    <section className="ledger-card p-4">
      <div className="mb-3">
        <h3 className="t-eyebrow">{title}</h3>
      </div>

      {loading && <p className="t-meta text-xs">Locking attested price...</p>}

      {!loading && error && <p className="text-xs text-text-mute">{error}</p>}

      {!loading && !error && data && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-[var(--radius-btn)] border border-border bg-surface px-2.5 py-2">
              <p className="t-meta mb-1">Ticker</p>
              <p className="num text-sm font-medium text-text">{data.normalized_ticker}</p>
            </div>
            <div className="rounded-[var(--radius-btn)] border border-border bg-surface px-2.5 py-2">
              <p className="t-meta mb-1">Market state</p>
              <p className="num text-sm font-medium text-text">{data.market_state}</p>
            </div>
          </div>

          <div className="rounded-[var(--radius-btn)] border border-border bg-surface px-2.5 py-2">
            <p className="t-meta mb-1">Locked price</p>
            <p className="num text-base font-semibold text-text">
              {data.currency} {fmtPrice(data.price)}
            </p>
            <p className="num mt-1 text-xs text-text-mute">{formatTimestamp(data.timestamp)}</p>
          </div>

          <div className="rounded-[var(--radius-btn)] border border-border bg-surface px-2.5 py-2">
            <p className="t-meta mb-1">Attestation ID</p>
            <p className="num break-all text-[11px] text-text-mute">{data.attestation.id}</p>
          </div>

          <p className="text-xs leading-relaxed text-text-faint">
            {data.attestation.latency_disclosure}
          </p>
        </div>
      )}
    </section>
  );
}
