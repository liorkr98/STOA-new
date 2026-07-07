/** Serializable indicator overlays stored on chartNode attrs. */

export type ChartIndicator =
  | { type: "sma"; period: number }
  | { type: "rsi"; period: number };

export function parseIndicators(raw: unknown): ChartIndicator[] {
  if (!Array.isArray(raw)) return [];
  const out: ChartIndicator[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const period = typeof o.period === "number" ? o.period : 14;
    if (o.type === "sma" && period >= 2) out.push({ type: "sma", period });
    else if (o.type === "rsi" && period >= 2) out.push({ type: "rsi", period });
  }
  return out;
}

export const INDICATOR_PRESETS: { label: string; indicator: ChartIndicator }[] = [
  { label: "RSI (14)", indicator: { type: "rsi", period: 14 } },
  { label: "SMA 50", indicator: { type: "sma", period: 50 } },
  { label: "SMA 200", indicator: { type: "sma", period: 200 } },
];
