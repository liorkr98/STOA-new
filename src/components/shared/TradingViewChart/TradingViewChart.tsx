"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { chartRangeToTvInterval, toTradingViewSymbol } from "@/lib/market/tradingview-symbol";
import type { ChartRange } from "@/lib/market/candle-types";

const WIDGET_SCRIPT = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

export interface TradingViewChartProps {
  ticker: string;
  range?: ChartRange;
  className?: string;
  height?: number;
}

/**
 * TradingView Advanced Chart embed — full widget with indicators, drawing tools,
 * date ranges, and symbol search. Used in compose chartNode (engine: tradingview).
 */
export function TradingViewChart({
  ticker,
  range = "3M",
  className = "",
  height = 480,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined" || !containerRef.current) return;

    const container = containerRef.current;
    const widgetHost = container.querySelector(".tradingview-widget-container__widget");
    if (!widgetHost) return;

    widgetHost.innerHTML = "";

    const theme = resolvedTheme === "light" ? "light" : "dark";
    const symbol = toTradingViewSymbol(ticker);
    const interval = chartRangeToTvInterval(range);

    const config = {
      autosize: true,
      symbol,
      interval,
      timezone: "exchange",
      theme,
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      withdateranges: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      details: true,
      hotlist: false,
      studies: ["STD;RSI", "STD;MACD", "STD;Volume"],
      backgroundColor: theme === "light" ? "rgba(255, 255, 255, 1)" : "rgba(15, 15, 18, 1)",
      gridColor: theme === "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)",
    };

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
  }, [mounted, ticker, range, resolvedTheme]);

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
