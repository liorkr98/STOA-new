"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { demoPriceSeries } from "@/lib/demo/clips";

/**
 * Price path for a publication's ticker. Live sparkline when the market route
 * answers; a stable seeded series otherwise, so the card is never an empty box.
 */
export function TickerChart({ ticker, caption }: { ticker: string; caption?: string }) {
  const fallback = useMemo(() => demoPriceSeries(ticker), [ticker]);
  const [points, setPoints] = useState<number[]>(fallback);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/market/sparkline?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { points?: number[] } | null) => {
        if (ignore) return;
        if (body?.points && body.points.length >= 2) setPoints(body.points);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [ticker]);

  const first = points[0];
  const last = points[points.length - 1];
  const change = first ? ((last - first) / first) * 100 : 0;
  const up = change >= 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <span className="num text-[1.25rem] tracking-tight">{ticker}</span>
        <span className={`num text-[0.875rem] ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
          {up ? "+" : ""}
          {change.toFixed(1)}%
        </span>
      </div>
      <div className="mt-3 min-h-0 flex-1">
        <Sparkline data={points} width={360} height={160} className="h-full w-full" />
      </div>
      {caption ? <p className="mt-3 text-[0.8125rem] leading-snug text-text-mute">{caption}</p> : null}
    </div>
  );
}
