"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrackPoint {
  /** Resolved call index or label. */
  label: string;
  /** Running Track Score (0-100). */
  score: number;
}

/** The analyst's Track Score over their resolved calls. Accent stroke, no grid noise. */
export function TrackChart({ data }: { data: TrackPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="trackFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--text-mute)" }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#trackFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
