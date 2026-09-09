"use client";

import { TradingViewChart } from "@/components/shared/TradingViewChart/TradingViewChart";
import { toTradingViewRange } from "@/lib/market/tradingview-symbol";

/**
 * TradingView Advanced Chart embed for Markets. HIT/MISS dots cannot be drawn
 * inside the iframe (the licensed Charting Library is not in this repo), so
 * the Stoa record still lives on the annotated tape beside this widget.
 */
export function MarketTradingViewChartCard({
  ticker,
  range = "1Y",
  compact = false,
}: {
  ticker: string;
  range?: string;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-[var(--paper)]">
      <TradingViewChart
        ticker={ticker}
        range={toTradingViewRange(range)}
        height={compact ? 240 : 440}
        compact={compact}
      />
    </div>
  );
}
