"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, Star, X } from "@phosphor-icons/react";
import { UNIVERSE } from "@/lib/universe";
import { useWatchlist } from "@/lib/watchlist";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkline } from "@/components/charts/sparkline";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DensityRoot } from "@/components/layout/density-root";
import type { ScreenerRow } from "@/app/api/market/screener/route";

/**
 * Watchlist (Part G) on the shared DataTable: price, day change, 30d trend,
 * and fundamentals columns (P/E, revenue growth via the day-cached screener
 * sweep), with sort, column chooser, summary row, and CSV export.
 */

const inputClass =
  "h-11 w-full rounded-[var(--radius-btn)] border border-border bg-surface pl-10 pr-3 text-sm focus-ring";

interface Row {
  ticker: string;
  name: string;
  price: number | null;
  dayPct: number | null;
  points: number[];
  pe: number | null;
  revenueGrowth: number | null;
}

const money = (v: number) => `$${v.toFixed(2)}`;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const one = (v: number) => v.toFixed(1);

export default function WatchlistPage() {
  const { tickers, ready, toggle } = useWatchlist();
  const [query, setQuery] = useState("");

  const { data: market } = useQuery({
    queryKey: ["watchlist-market", tickers.slice().sort().join(",")],
    enabled: tickers.length > 0,
    queryFn: async () => {
      const qs = tickers.map((t) => encodeURIComponent(t)).join(",");
      const res = await fetch(`/api/market/quotes?tickers=${qs}&sparks=1`);
      if (!res.ok) return {};
      const body = (await res.json()) as {
        quotes?: Record<string, { price: number | null }>;
        points?: Record<string, number[]>;
      };
      const out: Record<string, { price: number | null; points: number[] }> = {};
      for (const t of tickers) {
        out[t] = { price: body.quotes?.[t]?.price ?? null, points: body.points?.[t] ?? [] };
      }
      return out;
    },
  });

  const { data: screener } = useQuery({
    queryKey: ["screener"],
    enabled: tickers.length > 0,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/market/screener");
      if (!res.ok) return { rows: [] as ScreenerRow[] };
      return (await res.json()) as { rows: ScreenerRow[] };
    },
  });

  const rows: Row[] = useMemo(
    () =>
      tickers.map((t) => {
        const meta = UNIVERSE.find((u) => u.ticker === t);
        const m = market?.[t];
        const s = screener?.rows.find((r) => r.ticker === t);
        const points = m?.points ?? [];
        const prev = points.length > 1 ? points[points.length - 2] : null;
        const dayPct =
          m?.price != null && prev ? ((m.price - prev) / prev) * 100 : null;
        return {
          ticker: t,
          name: meta?.name ?? "",
          price: m?.price ?? null,
          dayPct,
          points,
          pe: s?.pe ?? null,
          revenueGrowth: s?.revenueGrowth ?? null,
        };
      }),
    [tickers, market, screener],
  );

  const columns: Column<Row>[] = [
    {
      key: "ticker",
      header: "Ticker",
      render: (r) => (
        <Link href={`/markets/${r.ticker}`} className="hover:underline">
          <span className="num font-semibold">{r.ticker}</span>
          {r.name && <span className="t-meta ml-2 text-[11px]">{r.name}</span>}
        </Link>
      ),
    },
    {
      key: "trend",
      header: "30d",
      sortable: false,
      render: (r) =>
        r.points.length > 1 ? (
          <Sparkline data={r.points} width={80} height={22} />
        ) : (
          <span className="text-text-faint">-</span>
        ),
    },
    { key: "price", header: "Price", numeric: true, format: money, accessor: (r) => r.price },
    {
      key: "dayPct",
      header: "Day",
      numeric: true,
      sentiment: true,
      format: pct,
      accessor: (r) => r.dayPct,
    },
    { key: "pe", header: "P/E", numeric: true, format: one, accessor: (r) => r.pe },
    {
      key: "revenueGrowth",
      header: "Rev growth",
      numeric: true,
      sentiment: true,
      format: (v) => `${v.toFixed(1)}%`,
      accessor: (r) => r.revenueGrowth,
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (r) => (
        <button
          type="button"
          onClick={() => toggle(r.ticker)}
          aria-label={`Remove ${r.ticker} from watchlist`}
          className="tap-target focus-ring rounded-[var(--radius-btn)] p-1 text-text-faint transition-colors hover:text-text"
        >
          <X size={15} />
        </button>
      ),
    },
  ];

  const results =
    query.trim().length > 0
      ? UNIVERSE.filter(
          (u) =>
            u.ticker.toLowerCase().includes(query.toLowerCase()) ||
            u.name.toLowerCase().includes(query.toLowerCase()),
        ).slice(0, 6)
      : [];

  return (
    <DensityRoot className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="t-h1">Watchlist</h1>
        <p className="t-body mt-1">Tickers you are tracking, with Stoa coverage one tap away.</p>
      </div>

      <div className="relative max-w-2xl">
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

      {!ready ? null : rows.length > 0 ? (
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.ticker}
          summary={["avg", "median"]}
          csvName="watchlist"
        />
      ) : (
        <EmptyState
          icon={<Star size={32} />}
          title="Nothing on your watchlist yet"
          body="Search for a ticker above, or add one from any Markets page."
        />
      )}
    </DensityRoot>
  );
}
