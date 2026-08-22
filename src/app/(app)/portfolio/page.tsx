"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Plus, Briefcase } from "lucide-react";
import { DensityRoot } from "@/components/layout/density-root";
import { usePortfolio, type Holding } from "@/lib/portfolio";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Investor portfolio (Part G): holdings with cost basis, live market value,
 * P/L, and weightings, on the shared DataTable. localStorage-backed for now.
 */

interface Row {
  ticker: string;
  shares: number;
  cost: number;
  price: number | null;
  value: number;
  pl: number;
  plPct: number | null;
  weight: number;
}

const money = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const pctFmt = (v: number) => `${v.toFixed(1)}%`;

export default function PortfolioPage() {
  const { holdings, ready, upsert, remove } = usePortfolio();

  const { data: quotes } = useQuery({
    queryKey: ["portfolio-quotes", holdings.map((h) => h.ticker).sort().join(",")],
    enabled: holdings.length > 0,
    queryFn: async () => {
      const qs = holdings.map((h) => encodeURIComponent(h.ticker)).join(",");
      const r = await fetch(`/api/market/quotes?tickers=${qs}`);
      if (!r.ok) return {} as Record<string, number | null>;
      const body = (await r.json()) as { quotes?: Record<string, { price: number | null }> };
      const out: Record<string, number | null> = {};
      for (const h of holdings) out[h.ticker] = body.quotes?.[h.ticker]?.price ?? null;
      return out;
    },
  });

  const rows: Row[] = useMemo(() => {
    const priced = holdings.map((h) => {
      const price = quotes?.[h.ticker] ?? null;
      const value = price != null ? price * h.shares : 0;
      const pl = price != null ? value - h.cost : 0;
      const plPct = h.cost > 0 && price != null ? (pl / h.cost) * 100 : null;
      return { ...h, price, value, pl, plPct, weight: 0 };
    });
    const total = priced.reduce((a, r) => a + r.value, 0);
    return priced.map((r) => ({ ...r, weight: total > 0 ? (r.value / total) * 100 : 0 }));
  }, [holdings, quotes]);

  const totals = useMemo(() => {
    const value = rows.reduce((a, r) => a + r.value, 0);
    const cost = rows.reduce((a, r) => a + r.cost, 0);
    const pl = value - cost;
    return { value, cost, pl, plPct: cost > 0 ? (pl / cost) * 100 : 0 };
  }, [rows]);

  const columns: Column<Row>[] = [
    {
      key: "ticker",
      header: "Ticker",
      render: (r) => (
        <Link href={`/markets/${r.ticker}`} className="num font-semibold hover:underline">
          {r.ticker}
        </Link>
      ),
    },
    { key: "shares", header: "Shares", numeric: true },
    { key: "cost", header: "Cost basis", numeric: true, format: money },
    {
      key: "price",
      header: "Price",
      numeric: true,
      format: money,
      accessor: (r) => r.price ?? null,
    },
    { key: "value", header: "Mkt value", numeric: true, format: money },
    { key: "pl", header: "P/L", numeric: true, sentiment: true, format: money },
    {
      key: "plPct",
      header: "P/L %",
      numeric: true,
      sentiment: true,
      accessor: (r) => r.plPct ?? null,
      format: pctFmt,
    },
    { key: "weight", header: "Weight", numeric: true, format: pctFmt },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (r) => (
        <button
          type="button"
          aria-label={`Remove ${r.ticker}`}
          onClick={() => remove(r.ticker)}
          className="text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <DensityRoot className="mx-auto w-full max-w-[var(--w-standard)] flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="t-h1">Portfolio</h1>
          <p className="t-body mt-1">Track holdings, cost basis, and live P/L.</p>
        </div>
        {rows.length > 0 && (
          <div className="text-right">
            <div className="num text-2xl font-semibold">{money(totals.value)}</div>
            <div
              className="num text-sm"
              style={{ color: totals.pl >= 0 ? "var(--up)" : "var(--down)" }}
            >
              {totals.pl >= 0 ? "+" : ""}
              {money(totals.pl)} ({pctFmt(totals.plPct)})
            </div>
          </div>
        )}
      </div>

      <AddHoldingForm onAdd={upsert} />

      {ready && rows.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={22} />}
          title="No holdings yet"
          body="Add a position above to start tracking your portfolio."
        />
      ) : (
        <DataTable columns={columns} data={rows} rowKey={(r) => r.ticker} csvName="portfolio" />
      )}
    </DensityRoot>
  );
}

function AddHoldingForm({ onAdd }: { onAdd: (h: Holding) => void }) {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    const s = Number(shares);
    const c = Number(cost);
    if (!t || !Number.isFinite(s) || s <= 0) return;
    onAdd({ ticker: t, shares: s, cost: Number.isFinite(c) ? c : 0 });
    setTicker("");
    setShares("");
    setCost("");
  }

  const field = "h-10 rounded-[var(--radius-btn)] border border-border bg-surface px-3 text-sm focus-ring";

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        placeholder="Ticker"
        className={`num w-24 ${field}`}
      />
      <input
        value={shares}
        onChange={(e) => setShares(e.target.value)}
        placeholder="Shares"
        type="number"
        min={0}
        step="any"
        className={`num w-28 ${field}`}
      />
      <input
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        placeholder="Cost basis $"
        type="number"
        min={0}
        step="any"
        className={`num w-36 ${field}`}
      />
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-btn)] bg-accent px-3 text-sm font-semibold text-accent-ink focus-ring"
      >
        <Plus size={15} /> Add
      </button>
    </form>
  );
}
