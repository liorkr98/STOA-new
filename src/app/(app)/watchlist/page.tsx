"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, Star, X } from "@phosphor-icons/react";
import { UNIVERSE } from "@/lib/universe";
import { useWatchlist } from "@/lib/watchlist";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkline } from "@/components/charts/sparkline";

const inputClass =
  "h-11 w-full rounded-[var(--radius-btn)] border border-border bg-surface pl-10 pr-3 text-sm focus-ring";

function WatchlistRow({ ticker, onRemove }: { ticker: string; onRemove: () => void }) {
  const meta = UNIVERSE.find((u) => u.ticker === ticker);
  const { data: quote } = useQuery({
    queryKey: ["quote", ticker],
    queryFn: () => fetch(`/api/market/quote?ticker=${ticker}`).then((r) => r.json()),
  });
  const { data: sparkline } = useQuery({
    queryKey: ["sparkline", ticker],
    queryFn: () => fetch(`/api/market/sparkline?ticker=${ticker}`).then((r) => r.json()),
  });

  return (
    <li className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0">
      <Link href={`/markets/${ticker}`} className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0">
          <div className="num font-semibold">{ticker}</div>
          <div className="t-meta truncate">{meta?.name ?? "Ticker"}</div>
        </div>
        {sparkline?.points?.length > 1 && (
          <Sparkline data={sparkline.points} width={80} height={24} />
        )}
        <span className="num ml-auto text-sm font-medium">
          {quote?.price != null ? `$${quote.price.toFixed(2)}` : "—"}
        </span>
      </Link>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${ticker} from watchlist`}
        className="focus-ring rounded-full p-1.5 text-text-faint transition-colors hover:text-text"
      >
        <X size={16} />
      </button>
    </li>
  );
}

export default function WatchlistPage() {
  const { tickers, ready, toggle } = useWatchlist();
  const [query, setQuery] = useState("");

  const results =
    query.trim().length > 0
      ? UNIVERSE.filter(
          (u) =>
            u.ticker.toLowerCase().includes(query.toLowerCase()) ||
            u.name.toLowerCase().includes(query.toLowerCase()),
        ).slice(0, 6)
      : [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="t-h1">Watchlist</h1>
        <p className="t-body mt-1">Tickers you are tracking, with Stoa coverage one tap away.</p>
      </div>

      <div className="relative">
        <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add a ticker..."
          className={inputClass}
        />
        {results.length > 0 && (
          <ul className="surface absolute z-10 mt-1 w-full overflow-hidden p-1">
            {results.map((r) => (
              <li key={r.ticker}>
                <button
                  type="button"
                  onClick={() => {
                    toggle(r.ticker);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--r-tag)] px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span>
                    <span className="num font-medium">{r.ticker}</span>{" "}
                    <span className="t-meta">{r.name}</span>
                  </span>
                  <Star size={14} weight={tickers.includes(r.ticker) ? "fill" : "regular"} className="text-[var(--brass)]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!ready ? null : tickers.length > 0 ? (
        <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {tickers.map((t) => (
            <WatchlistRow key={t} ticker={t} onRemove={() => toggle(t)} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Star size={32} />}
          title="Nothing on your watchlist yet"
          body="Search for a ticker above, or add one from any Markets page."
        />
      )}
    </div>
  );
}
