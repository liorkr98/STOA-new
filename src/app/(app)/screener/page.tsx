"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DensityRoot } from "@/components/layout/density-root";
import type { ScreenerRow } from "@/app/api/market/screener/route";

/**
 * Screener (Part G): filter the covered universe by fundamentals on the shared
 * DataTable. Data comes from /api/market/screener (Finnhub metrics, day-cached).
 */

interface Filters {
  sector: string;
  peMax: string;
  growthMin: string;
  marginMin: string;
}

const pct = (v: number) => `${v.toFixed(1)}%`;
const one = (v: number) => v.toFixed(1);

export default function ScreenerPage() {
  const [filters, setFilters] = useState<Filters>({ sector: "", peMax: "", growthMin: "", marginMin: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["screener"],
    queryFn: async () => {
      const res = await fetch("/api/market/screener");
      if (!res.ok) throw new Error("screener unavailable");
      return (await res.json()) as { rows: ScreenerRow[] };
    },
    staleTime: 60 * 60_000,
  });

  const sectors = useMemo(
    () => [...new Set((data?.rows ?? []).map((r) => r.sector))].sort(),
    [data?.rows],
  );

  const rows = useMemo(() => {
    const peMax = Number(filters.peMax);
    const growthMin = Number(filters.growthMin);
    const marginMin = Number(filters.marginMin);
    return (data?.rows ?? []).filter((r) => {
      if (filters.sector && r.sector !== filters.sector) return false;
      if (filters.peMax && (r.pe == null || r.pe > peMax)) return false;
      if (filters.growthMin && (r.revenueGrowth == null || r.revenueGrowth < growthMin)) return false;
      if (filters.marginMin && (r.netMargin == null || r.netMargin < marginMin)) return false;
      return true;
    });
  }, [data?.rows, filters]);

  const columns: Column<ScreenerRow>[] = [
    {
      key: "ticker",
      header: "Ticker",
      render: (r) => (
        <Link href={`/markets/${r.ticker}`} className="num font-semibold hover:underline">
          {r.ticker}
        </Link>
      ),
    },
    { key: "name", header: "Company" },
    { key: "sector", header: "Sector" },
    { key: "pe", header: "P/E", numeric: true, format: one, accessor: (r) => r.pe },
    { key: "psTtm", header: "P/S", numeric: true, format: one, accessor: (r) => r.psTtm },
    {
      key: "revenueGrowth",
      header: "Rev growth",
      numeric: true,
      sentiment: true,
      format: pct,
      accessor: (r) => r.revenueGrowth,
    },
    { key: "grossMargin", header: "Gross margin", numeric: true, format: pct, accessor: (r) => r.grossMargin },
    {
      key: "netMargin",
      header: "Net margin",
      numeric: true,
      sentiment: true,
      format: pct,
      accessor: (r) => r.netMargin,
    },
    { key: "beta", header: "Beta", numeric: true, format: one, accessor: (r) => r.beta },
  ];

  const field =
    "h-9 rounded-[var(--radius-btn)] border border-border bg-surface px-2.5 text-sm focus-ring";

  return (
    <DensityRoot className="flex flex-col gap-5">
      <div>
        <h1 className="t-h1">Screener</h1>
        <p className="t-body mt-1">Filter the covered universe by fundamentals.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={15} className="text-text-faint" />
        <select
          value={filters.sector}
          onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}
          className={field}
        >
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={filters.peMax}
          onChange={(e) => setFilters((f) => ({ ...f, peMax: e.target.value }))}
          placeholder="Max P/E"
          type="number"
          className={`num w-28 ${field}`}
        />
        <input
          value={filters.growthMin}
          onChange={(e) => setFilters((f) => ({ ...f, growthMin: e.target.value }))}
          placeholder="Min growth %"
          type="number"
          className={`num w-32 ${field}`}
        />
        <input
          value={filters.marginMin}
          onChange={(e) => setFilters((f) => ({ ...f, marginMin: e.target.value }))}
          placeholder="Min net margin %"
          type="number"
          className={`num w-36 ${field}`}
        />
        <span className="t-meta ml-auto">
          {rows.length} of {data?.rows.length ?? 0}
        </span>
      </div>

      {isLoading ? (
        <p className="t-meta">Loading fundamentals...</p>
      ) : error || !data ? (
        <EmptyState title="Screener unavailable" body="Sign in and make sure market data is configured." />
      ) : (
        <DataTable columns={columns} data={rows} rowKey={(r) => r.ticker} csvName="screener" />
      )}
    </DensityRoot>
  );
}
