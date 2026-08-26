"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

type Point = { i: number; p: number };

/** Lightweight chart preview for editor blocks (mock series when offline). */
export function MiniChart({ ticker }: { ticker: string }) {
  // Deterministic stand-in, derived from the ticker rather than stored, so a
  // ticker change swaps it during render instead of through an effect.
  const placeholder = useMemo<Point[]>(() => {
    let h = 0;
    for (const ch of ticker) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const base = 80 + (h % 200);
    return Array.from({ length: 24 }, (_, i) => ({
      i,
      p: Math.round((base + Math.sin(i / 3) * 12 + (h % 20)) * 100) / 100,
    }));
  }, [ticker]);

  const [fetched, setFetched] = useState<{ ticker: string; points: Point[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/market/sparkline?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((j: { points?: number[] }) => {
        if (cancelled || !j.points?.length) return;
        setFetched({ ticker, points: j.points.map((p, i) => ({ i, p })) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  // Tagging the fetch with its ticker keeps a stale response from painting.
  const data = fetched?.ticker === ticker ? fetched.points : placeholder;

  return (
    <div className="h-36 w-full rounded-[var(--radius-btn)] border border-border bg-bg/40 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={["auto", "auto"]} hide />
          <Line
            type="monotone"
            dataKey="p"
            stroke="var(--ink)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
