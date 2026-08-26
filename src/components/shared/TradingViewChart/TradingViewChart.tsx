"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useHydrated } from "@/lib/hooks/use-stored-value";
import { chartRangeToTvInterval, toTradingViewSymbol } from "@/lib/market/tradingview-symbol";
import type { ChartRange } from "@/lib/market/candle-types";

const WIDGET_SCRIPT = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

export interface TradingViewChartProps {
  ticker: string;
  range?: ChartRange;
  /** TradingView study ids, e.g. ["STD;RSI"]. Persisted on chartNode attrs. */
  studies?: string[];
  className?: string;
  height?: number;
  /** Card and video overlay: hide drawing chrome, keep the tape. */
  compact?: boolean;
}

/**
 * TradingView Advanced Chart embed — full widget with indicators, drawing tools,
 * date ranges, and symbol search. Used in compose chartNode (engine: tradingview).
 */
export function TradingViewChart({
  ticker,
  range = "3M",
  studies = [],
  className = "",
  height = 480,
  compact = false,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const mounted = useHydrated();

  const studiesKey = studies.join("|");

  useEffect(() => {
    if (!mounted || typeof window === "undefined" || !containerRef.current) return;

    const container = containerRef.current;
    const widgetHost = container.querySelector(".tradingview-widget-container__widget");
    if (!widgetHost) return;

    widgetHost.innerHTML = "";

    const theme = resolvedTheme === "light" ? "light" : "dark";
    const symbol = toTradingViewSymbol(ticker);
    const interval = chartRangeToTvInterval(range);

    const config: Record<string, unknown> = {
      autosize: true,
      symbol,
      interval,
      timezone: "exchange",
      theme,
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      withdateranges: !compact,
      hide_side_toolbar: compact,
      hide_top_toolbar: compact,
      hide_legend: compact,
      save_image: !compact,
      details: !compact,
      hotlist: false,
      backgroundColor: theme === "light" ? "rgba(255, 255, 255, 1)" : "rgba(15, 15, 18, 1)",
      gridColor: theme === "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)",
    };
    if (studies.length > 0) {
      config.studies = studies;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = WIDGET_SCRIPT;
    script.async = true;
    script.textContent = JSON.stringify(config);
    widgetHost.appendChild(script);

    return () => {
      script.remove();
      widgetHost.innerHTML = "";
    };
  }, [mounted, ticker, range, resolvedTheme, studiesKey, compact]);

  if (!mounted) {
    return (
      <div
        className={className}
        style={{ height }}
        aria-hidden
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`tradingview-widget-container ${className}`}
      style={{ height, width: "100%" }}
    >
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 28px)", width: "100%" }} />
      <div className="tradingview-widget-copyright py-1 text-center">
        <a
          href="https://www.tradingview.com/"
          rel="noopener noreferrer nofollow"
          target="_blank"
          className="text-[10px] text-text-faint hover:text-text-mute"
        >
          Chart by TradingView
        </a>
      </div>
    </div>
  );
}
