"use client";

import { TickerChart } from "@/components/feed/ticker-chart";
import { TradingViewChart } from "@/components/shared/TradingViewChart/TradingViewChart";
import { cn } from "@/lib/design/cn";

export type ChartEngine = "yahoo" | "tradingview";

/**
 * Live tape on an evidence card. Yahoo is the sparkline (our market layer).
 * TradingView is the full widget. Dummy SVG is not a source.
 */
export function CardChart({
  ticker,
  engine,
  caption,
  compact = false,
  className,
}: {
  ticker: string;
  engine: ChartEngine;
  caption?: string;
  compact?: boolean;
  className?: string;
}) {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) {
    return (
      <div className={cn("flex h-full min-h-24 items-center justify-center border border-dashed border-border bg-surface-2", className)}>
        <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">Set a ticker</span>
      </div>
    );
  }

  if (engine === "tradingview") {
    return (
      <div className={cn("flex h-full min-h-0 flex-col", className)}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="num text-[0.8125rem] tracking-tight">{symbol}</span>
          <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">TradingView</span>
        </div>
        <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-[var(--radius-btn)] border border-border">
          <TradingViewChart ticker={symbol} range="3M" height={compact ? 160 : 220} compact />
        </div>
        {caption ? <p className="mt-2 text-[0.8125rem] leading-snug text-text-mute">{caption}</p> : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <TickerChart ticker={symbol} caption={caption} />
      <p className="num mt-1 text-[10px] uppercase tracking-[0.14em] text-text-faint">Yahoo Finance</p>
    </div>
  );
}
