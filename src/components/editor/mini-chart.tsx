"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

/** Lightweight chart preview for editor blocks (mock series when offline). */
export function MiniChart({ ticker }: { ticker: string }) {
  const [data, setData] = useState<{ i: number; p: number }[]>([]);

  useEffect(() => {
    let h = 0;
    for (const ch of ticker) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const base = 80 + (h % 200);
    const pts = Array.from({ length: 24 }, (_, i) => ({
      i,
      p: Math.round((base + Math.sin(i / 3) * 12 + (h % 20)) * 100) / 100,
    }));
    setData(pts);

    fetch(`/api/market/sparkline?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((j: { points?: number[] }) => {
        if (j.points?.length) {
          setData(j.points.map((p, i) => ({ i, p })));
        }
      })
      .catch(() => {});
  }, [ticker]);

  return (
    <div className="h-36 w-full rounded-[var(--radius-btn)] border border-border bg-bg/40 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={["auto", "auto"]} hide />
          <Line
            type="monotone"
            dataKey="p"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
