"use client";

import { useState, useTransition } from "react";
import { CardChart, type ChartEngine } from "@/components/compose/card-chart";
import { CardPreview } from "@/components/compose/card-preview";
import { cn } from "@/lib/design/cn";
import { NAPKIN_DEFAULT_STYLE_ID } from "@/lib/napkin/styles";
import { sourceLabel, type VisualSource } from "@/lib/compose/overlays";
import type { DraftCard } from "@/lib/compose/cards";

/**
 * What sits over the clip: a real card, a live tape, or a Napkin visual.
 * Paper surface, hairline, no dummy SVG.
 */
export function OverlayVisualBody({
  source,
  cards,
  className,
  ticker,
}: {
  source: VisualSource;
  cards: DraftCard[];
  className?: string;
  ticker?: string;
}) {
  const card = source.type === "card" && source.cardId ? cards.find((c) => c.id === source.cardId) ?? null : null;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-border bg-paper text-[var(--ink)]",
        className,
      )}
    >
      {card ? (
        <CardPreview card={card} compact className="h-full w-full overflow-hidden border-0 bg-transparent" />
      ) : source.type === "chart" ? (
        <div className="h-full w-full p-3">
          <CardChart
            ticker={source.ticker || ticker || ""}
            engine={source.engine ?? "yahoo"}
            compact
            className="h-full"
          />
        </div>
      ) : source.type === "diagram" && source.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source.imageUrl} alt="" className="h-full w-full object-contain p-2" />
      ) : source.type === "figure" || source.type === "upload" ? (
        source.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source.imageUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="num p-3 text-[10px] uppercase tracking-[0.14em] text-text-mute">{sourceLabel(source)}</span>
        )
      ) : (
        <span className="num p-3 text-[10px] uppercase tracking-[0.14em] text-text-mute">{sourceLabel(source)}</span>
      )}
    </div>
  );
}

export function OverlayVisualizeFields({
  prompt,
  imageUrl,
  onChange,
}: {
  prompt: string;
  imageUrl: string | null;
  onChange: (next: { prompt: string; imageUrl: string | null }) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function generate() {
    setError(null);
    start(async () => {
      try {
        const res = await fetch("/api/ai/napkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: prompt,
            format: "png",
            number_of_visuals: 1,
            style_id: NAPKIN_DEFAULT_STYLE_ID,
          }),
        });
        const body = (await res.json()) as { visuals?: { url: string }[]; error?: string };
        if (!res.ok || !body.visuals?.[0]?.url) {
          setError(body.error ?? "Could not generate a visual.");
          return;
        }
        onChange({ prompt, imageUrl: body.visuals[0].url });
      } catch {
        setError("Could not generate a visual.");
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <label className="block text-[11px] text-text-mute">
        What to visualize
        <textarea
          value={prompt}
          onChange={(e) => onChange({ prompt: e.target.value, imageUrl })}
          rows={3}
          placeholder="The three steps in the margin expansion, as a simple diagram"
          className="mt-1 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-2 py-1.5 text-sm text-text focus-ring"
        />
      </label>
      <button
        type="button"
        disabled={pending || !prompt.trim()}
        onClick={generate}
        className="focus-ring rounded-[var(--radius-btn)] border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-[11px] font-medium text-[var(--paper)] disabled:opacity-50"
      >
        {pending ? "Generating..." : imageUrl ? "Regenerate with Napkin" : "Generate with Napkin"}
      </button>
      {error ? <p className="text-[11px] text-[var(--down)]">{error}</p> : null}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="max-h-36 w-full rounded-[var(--radius-btn)] border border-border object-contain" />
      ) : null}
    </div>
  );
}

export function OverlayChartFields({
  ticker,
  engine,
  fallbackTicker,
  onChange,
}: {
  ticker: string;
  engine: ChartEngine;
  fallbackTicker?: string;
  onChange: (next: { ticker: string; engine: ChartEngine }) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-[11px] text-text-mute">
        Ticker
        <input
          value={ticker}
          onChange={(e) => onChange({ ticker: e.target.value.toUpperCase(), engine })}
          placeholder={fallbackTicker || "NVDA"}
          className="num mt-1 block w-24 rounded-[var(--radius-btn)] border border-border bg-bg px-2 py-1.5 text-sm focus-ring"
        />
      </label>
      <div className="flex gap-1" role="radiogroup" aria-label="Chart source">
        {(["yahoo", "tradingview"] as const).map((eng) => (
          <button
            key={eng}
            type="button"
            role="radio"
            aria-checked={engine === eng}
            onClick={() => onChange({ ticker: ticker || fallbackTicker || "SPY", engine: eng })}
            className={cn(
              "rounded-[var(--radius-btn)] border px-2 py-1.5 text-[11px] focus-ring",
              engine === eng
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                : "border-border text-text-mute hover:text-text",
            )}
          >
            {eng === "yahoo" ? "Yahoo Finance" : "TradingView"}
          </button>
        ))}
      </div>
    </div>
  );
}
