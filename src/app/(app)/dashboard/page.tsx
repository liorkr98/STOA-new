"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DashboardBoard, SortableWidget } from "@/components/ui/dashboard-widget";
import { DensityRoot } from "@/components/layout/density-root";
import { useStoredValue } from "@/lib/hooks/use-stored-value";
import { useWatchlist } from "@/lib/watchlist";
import { usePortfolio } from "@/lib/portfolio";
import { UNIVERSE } from "@/lib/universe";

/**
 * Investor dashboard (Part G): drag-reorderable widgets on the shared
 * dashboard-widget pattern. Order persists locally; widgets read the same
 * quote proxy as everything else.
 */

const ORDER_KEY = "stoa-dashboard-order";
const ORDER_EVENT = "stoa-dashboard-order-changed";
const identity = (raw: string | null) => raw;
const DEFAULT_ORDER = ["watchlist", "portfolio", "movers"];

function useQuotes(tickers: string[]) {
  return useQuery({
    queryKey: ["dash-quotes", tickers.slice().sort().join(",")],
    enabled: tickers.length > 0,
    queryFn: async () => {
      const qs = tickers.map((t) => encodeURIComponent(t)).join(",");
      const r = await fetch(`/api/market/quotes?tickers=${qs}`);
      if (!r.ok) return {} as Record<string, number | null>;
      const body = (await r.json()) as { quotes?: Record<string, { price: number | null }> };
      const out: Record<string, number | null> = {};
      for (const t of tickers) out[t] = body.quotes?.[t]?.price ?? null;
      return out;
    },
  });
}

export default function DashboardPage() {
  // Storage is the source of truth for the layout, so the saved order is read
  // rather than copied into state on mount. Kept as the raw string because the
  // snapshot has to be comparable by value; the array is derived from it.
  const orderRaw = useStoredValue(ORDER_KEY, identity, null, ORDER_EVENT);

  const order = useMemo(() => {
    try {
      const saved = orderRaw ? (JSON.parse(orderRaw) as string[]) : null;
      const valid = saved?.filter((id) => DEFAULT_ORDER.includes(id));
      if (valid && valid.length === DEFAULT_ORDER.length) return valid;
    } catch {
      /* keep default */
    }
    return DEFAULT_ORDER;
  }, [orderRaw]);

  function reorder(ids: string[]) {
    try {
      window.localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
      window.dispatchEvent(new Event(ORDER_EVENT));
    } catch {
      /* storage unavailable: the layout stays as it was */
    }
  }

  const widgets: Record<string, React.ReactNode> = {
    watchlist: <WatchlistWidget key="watchlist" />,
    portfolio: <PortfolioWidget key="portfolio" />,
    movers: <MoversWidget key="movers" />,
  };

  return (
    <DensityRoot className="mx-auto w-full max-w-[var(--w-wide)] flex flex-col gap-5">
      <div>
        <h1 className="t-h1">Dashboard</h1>
        <p className="t-body mt-1">Your board. Drag widgets to arrange it.</p>
      </div>
      <DashboardBoard ids={order} onReorder={reorder} className="rounded-[var(--radius-card)] bg-surface-2 p-4">
        {order.map((id) => widgets[id])}
      </DashboardBoard>
    </DensityRoot>
  );
}

function Row({ ticker, price }: { ticker: string; price: number | null }) {
  return (
    <li className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
      <Link href={`/markets/${ticker}`} className="num text-sm font-medium hover:underline">
        {ticker}
      </Link>
      <span className="num text-sm text-text-mute">
        {price != null ? `$${price.toFixed(2)}` : "-"}
      </span>
    </li>
  );
}

function WatchlistWidget() {
  const { tickers, ready } = useWatchlist();
  const shown = tickers.slice(0, 6);
  const { data: quotes } = useQuotes(shown);
  return (
    <SortableWidget id="watchlist" title="Watchlist">
      {ready && shown.length === 0 ? (
        <p className="t-meta">
          Nothing watched yet. <Link href="/watchlist" className="underline">Add tickers</Link>.
        </p>
      ) : (
        <ul>{shown.map((t) => <Row key={t} ticker={t} price={quotes?.[t] ?? null} />)}</ul>
      )}
    </SortableWidget>
  );
}

function PortfolioWidget() {
  const { holdings, ready } = usePortfolio();
  const { data: quotes } = useQuotes(holdings.map((h) => h.ticker));
  const totals = useMemo(() => {
    let value = 0;
    let cost = 0;
    for (const h of holdings) {
      const p = quotes?.[h.ticker];
      if (p != null) value += p * h.shares;
      cost += h.cost;
    }
    return { value, cost, pl: value - cost };
  }, [holdings, quotes]);
  return (
    <SortableWidget id="portfolio" title="Portfolio">
      {ready && holdings.length === 0 ? (
        <p className="t-meta">
          No holdings yet. <Link href="/portfolio" className="underline">Add positions</Link>.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="num text-2xl font-semibold">
            ${totals.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span
            className="num text-sm"
            style={{ color: totals.pl >= 0 ? "var(--up)" : "var(--down)" }}
          >
            {totals.pl >= 0 ? "+" : ""}
            ${totals.pl.toLocaleString(undefined, { maximumFractionDigits: 0 })} P/L
          </span>
          <Link href="/portfolio" className="t-meta mt-1 underline">
            Open portfolio
          </Link>
        </div>
      )}
    </SortableWidget>
  );
}

function MoversWidget() {
  const tickers = UNIVERSE.slice(0, 6).map((u) => u.ticker);
  const { data: quotes } = useQuotes(tickers);
  return (
    <SortableWidget id="movers" title="Markets">
      <ul>{tickers.map((t) => <Row key={t} ticker={t} price={quotes?.[t] ?? null} />)}</ul>
    </SortableWidget>
  );
}
