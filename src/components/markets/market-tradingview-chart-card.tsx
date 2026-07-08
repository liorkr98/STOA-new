"use client";

import { ChartCandlestick } from "lucide-react";
import { TradingViewChart } from "@/components/shared/TradingViewChart/TradingViewChart";

export function MarketTradingViewChartCard({ ticker }: { ticker: string }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="t-h3">Price chart</h2>
          <p className="t-meta mt-1">Advanced TradingView chart with indicators and drawing tools.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-tag)] border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-mute">
          <ChartCandlestick size={13} />
          TradingView
        </span>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-[var(--paper)]">
        <TradingViewChart ticker={ticker} range="3M" height={520} />
      </div>
    </section>
  );
}
