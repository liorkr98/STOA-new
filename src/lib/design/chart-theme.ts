/**
 * Stoa chart theme -- the single source of chart color scales. Every chart
 * (chartNode, comparison, statement deltas, dashboards, heatmaps) imports its
 * colors from here so all data-viz reads as Stoa. See docs/DESIGN_LANGUAGE.md
 * section 3. Never redefine a scale inline in a component.
 *
 * All values are CSS-variable expressions, not literal hex, so they follow the
 * six-token palette and flip automatically in dark mode. Pass these strings
 * straight to a stroke/fill (Recharts, D3, inline style).
 */

/** Semantic colors -- direction is meaning, never swapped for aesthetics. */
export const semantic = {
  up: "var(--up)",
  down: "var(--down)",
  neutral: "var(--surface-2)",
} as const;

/**
 * Categorical scale for multi-series charts (peer comparison, up to 6 series).
 * Muted, ledger-like -- no neon. Beyond 6, aggregate rather than add a hue.
 */
export const categorical: readonly string[] = [
  "var(--verdigris)",
  "var(--brass)",
  "var(--plum)",
  "var(--rust)",
  "color-mix(in oklch, var(--verdigris) 55%, var(--ink))",
  "color-mix(in oklch, var(--brass) 60%, var(--ink))",
];

/**
 * Sequential scale for single-metric intensity (e.g. a heat column):
 * paper -> verdigris in 5 steps.
 */
export const sequential: readonly string[] = [12, 30, 50, 72, 100].map(
  (pct) => `color-mix(in oklch, var(--verdigris) ${pct}%, var(--surface))`,
);

/**
 * Diverging scale for valuation sensitivity / scenario grids (bull <-> bear):
 * rust -> neutral -> verdigris, mapping onto up/down semantics so a "good"
 * cell is green and a "bad" cell is rust.
 *
 * @param t position in [0,1]; 0 = most bearish (rust), 0.5 = neutral, 1 = most
 *          bullish (verdigris).
 */
export function diverging(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped < 0.5) {
    const mix = Math.round((1 - clamped * 2) * 100);
    return `color-mix(in oklch, var(--rust) ${mix}%, var(--surface-2))`;
  }
  const mix = Math.round((clamped - 0.5) * 2 * 100);
  return `color-mix(in oklch, var(--verdigris) ${mix}%, var(--surface-2))`;
}

/** Axes, gridlines, labels, and baseline. Hairline, quiet. */
export const axis = {
  grid: "var(--border)",
  label: "var(--text-faint)",
  baseline: "var(--border-strong)",
} as const;

/**
 * Pick a categorical color by series index, wrapping if a caller exceeds the
 * palette (callers should aggregate past 6, but never crash).
 */
export function seriesColor(index: number): string {
  return categorical[index % categorical.length];
}

export const chartTheme = {
  semantic,
  categorical,
  sequential,
  diverging,
  axis,
  seriesColor,
} as const;

export type ChartTheme = typeof chartTheme;
