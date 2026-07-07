"use client";

import { useEffect } from "react";
import { Trash2, ChartCandlestick } from "lucide-react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/design/cn";
import { CHART_RANGES, type ChartRange } from "@/lib/market/candle-types";
import { TradingViewChart } from "@/components/shared/TradingViewChart/TradingViewChart";

function stopEditorCapture(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/**
 * chartNode in TradingView Advanced Chart mode — full TV library in compose.
 * Reading view uses a captured screenshot when available, otherwise live embed.
 */
export function TradingViewChartPanel({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const ticker = String(node.attrs.ticker ?? "");
  const range = (node.attrs.range ?? "3M") as ChartRange;
  const nodeId = String(node.attrs.nodeId ?? "");
  const screenshotUrl = node.attrs.screenshotUrl ? String(node.attrs.screenshotUrl) : null;

  useEffect(() => {
    if (isEditable && !nodeId) updateAttributes({ nodeId: nanoid(10) });
  }, [isEditable, nodeId, updateAttributes]);

  if (!isEditable && screenshotUrl) {
    return (
      <NodeViewWrapper contentEditable={false} role="figure" className="fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={screenshotUrl} alt={`TradingView chart for ${ticker}`} className="block w-full" />
      </NodeViewWrapper>
    );
  }

  if (!isEditable && ticker) {
    return (
      <NodeViewWrapper contentEditable={false} role="figure" className="fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        <TradingViewChart ticker={ticker} range={range} height={480} />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      role="figure"
      className={cn(
        "fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
      onMouseDown={stopEditorCapture}
      onClick={stopEditorCapture}
    >
      {isEditable && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <ChartCandlestick size={14} className="text-accent" />
          <span className="t-eyebrow text-[11px]">TradingView</span>
          <input
            defaultValue={ticker}
            key={ticker}
            onBlur={(e) => updateAttributes({ ticker: e.target.value.trim().toUpperCase() })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                updateAttributes({ ticker: (e.target as HTMLInputElement).value.trim().toUpperCase() });
              }
            }}
            onMouseDown={stopEditorCapture}
            placeholder="Ticker"
            className="num w-20 rounded-[var(--radius-btn)] border border-border bg-bg px-2 py-1 text-sm font-semibold focus:border-accent focus:outline-none"
          />
          <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-bg p-0.5">
            {CHART_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onMouseDown={stopEditorCapture}
                onClick={() => updateAttributes({ range: r })}
                className={cn(
                  "rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors",
                  range === r ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:text-text",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="t-meta hidden text-[10px] text-text-faint sm:inline">
            Indicators · drawings · ranges
          </span>
          <button
            type="button"
            aria-label="Delete chart"
            onMouseDown={stopEditorCapture}
            onClick={() => deleteNode()}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}

      <div className="px-1 pb-1">
        {ticker ? (
          <TradingViewChart ticker={ticker} range={range} height={isEditable ? 520 : 480} />
        ) : (
          <div className="flex h-[320px] items-center justify-center">
            <p className="t-meta text-sm text-text-mute">Enter a ticker to load TradingView</p>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
