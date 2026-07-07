"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/design/cn";
import {
  NAPKIN_CHART_STYLE_ID,
  NAPKIN_DEFAULT_STYLE_ID,
  NAPKIN_STYLES,
  NAPKIN_VARIATION_COUNT,
  NAPKIN_VISUAL_TYPES,
} from "@/lib/napkin/styles";

const WIDTHS = [50, 75, 100] as const;

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function NapkinNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const url = String(node.attrs.url ?? "");
  const sourceText = String(node.attrs.sourceText ?? "");
  const caption = String(node.attrs.caption ?? "");
  const chartMode = Boolean(node.attrs.chartMode);
  const chartTicker = String(node.attrs.chartTicker ?? "");
  const styleId = String(
    node.attrs.styleId ?? (chartMode ? NAPKIN_CHART_STYLE_ID : NAPKIN_DEFAULT_STYLE_ID),
  );
  const visualQuery = String(node.attrs.visualQuery ?? "");
  const widthPct = Number(node.attrs.widthPct ?? 100);
  const variationUrls = (node.attrs.variationUrls as string[]) ?? [];
  const autoGenerate = Boolean(node.attrs.autoGenerate);

  const [text, setText] = useState(sourceText);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const variationCount = chartMode ? NAPKIN_VARIATION_COUNT : 2;

  const generate = useCallback(async () => {
    const content = text.trim();
    if (!content) {
      setError("Add text to visualize");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/napkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          style_id: styleId || (chartMode ? NAPKIN_CHART_STYLE_ID : NAPKIN_DEFAULT_STYLE_ID),
          // Napkin API: visual_query cannot combine with number_of_visuals > 1
          visual_query: chartMode || variationCount > 1 ? undefined : visualQuery || undefined,
          format: "png",
          number_of_visuals: variationCount,
          context_before: chartMode
            ? `Annotated stock chart for ${chartTicker || "equity"}:`
            : undefined,
          context_after: chartMode
            ? "Show every price level as a labeled number on the chart."
            : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        visuals?: { url: string }[];
      };
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      const urls = (data.visuals ?? []).map((v) => v.url).filter(Boolean);
      if (urls.length === 0) {
        setError("No visuals returned");
        return;
      }
      updateAttributes({
        url: urls[0],
        sourceText: content,
        variationUrls: urls,
        autoGenerate: false,
      });
    } catch {
      setError("Generation failed — check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  }, [text, styleId, visualQuery, chartMode, chartTicker, variationCount, updateAttributes]);

  useEffect(() => {
    if (!autoGenerate || autoStarted.current || url) return;
    if (!sourceText.trim()) return;
    autoStarted.current = true;
    void generate();
  }, [autoGenerate, sourceText, url, generate]);

  const styleGroups = [...new Set(NAPKIN_STYLES.map((s) => s.group))];

  if (!isEditable) {
    if (!url) return <NodeViewWrapper contentEditable={false} className="hidden" />;
    return (
      <NodeViewWrapper contentEditable={false} role="figure" className="fade-up my-4">
        <div className="mx-auto" style={{ width: `${widthPct}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={caption || "Napkin visual"}
            className="block w-full rounded-[var(--radius-card)] border border-border"
          />
          {caption ? <p className="t-meta mt-1.5 text-center">{caption}</p> : null}
          <p className="t-meta mt-1 text-center text-[10px] text-text-faint">Visual by Napkin AI</p>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
      onMouseDown={stop}
      onClick={stop}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Wand2 size={14} className="text-accent" />
        <span className="t-eyebrow flex-1">
          {chartMode ? `Chart annotation${chartTicker ? ` · ${chartTicker}` : ""}` : "Napkin visual"}
        </span>
        {url ? (
          <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-bg p-0.5">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onMouseDown={stop}
                onClick={() => updateAttributes({ widthPct: w })}
                className={cn(
                  "num rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors",
                  widthPct === w
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-text-mute hover:text-text",
                )}
              >
                {w}%
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          aria-label="Delete Napkin block"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="space-y-3 p-3">
        {generating && !url ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 size={28} className="animate-spin text-accent" />
            <p className="text-sm font-medium text-text">
              {chartMode
                ? "Napkin is drawing labeled price levels on your chart…"
                : "Napkin is visualizing your selection…"}
            </p>
            <p className="max-w-sm text-xs text-text-mute line-clamp-4">{sourceText}</p>
          </div>
        ) : !url ? (
          <>
            {!chartMode ? (
              <label className="block">
                <span className="t-meta mb-1 block text-[11px]">Text to visualize</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onMouseDown={stop}
                  rows={4}
                  placeholder="Paste a thesis, process, or bullet list — Napkin turns it into a diagram."
                  className="w-full resize-y rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </label>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="t-meta mb-1 block text-[11px]">Style</span>
                <select
                  value={styleId}
                  onChange={(e) => updateAttributes({ styleId: e.target.value })}
                  onMouseDown={stop}
                  className="h-9 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm"
                >
                  {styleGroups.map((group) => (
                    <optgroup key={group} label={group}>
                      {NAPKIN_STYLES.filter((s) => s.group === group).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {!chartMode ? (
                <label className="block">
                  <span className="t-meta mb-1 block text-[11px]">Visual type</span>
                  <select
                    value={visualQuery}
                    onChange={(e) => updateAttributes({ visualQuery: e.target.value })}
                    onMouseDown={stop}
                    className="h-9 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm"
                  >
                    {NAPKIN_VISUAL_TYPES.map((t) => (
                      <option key={t.value || "auto"} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="flex items-end">
                  <p className="t-meta text-[11px] text-text-mute">
                    Generating {NAPKIN_VARIATION_COUNT} chart styles — pick the one with the clearest price labels.
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={generating}
              onMouseDown={stop}
              onClick={() => generate()}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-accent text-sm font-medium text-accent-ink transition hover:brightness-[1.06] disabled:opacity-60 focus-ring"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate with Napkin
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto" style={{ width: `${widthPct}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={caption || "Napkin visual"}
                className="block w-full rounded-[var(--radius-btn)] border border-border"
              />
            </div>
            {variationUrls.length > 1 ? (
              <div>
                <p className="t-meta mb-2 text-center text-[11px] text-text-mute">
                  Choose a diagram — prices should be clearly labeled
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {variationUrls.map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onMouseDown={stop}
                      onClick={() => updateAttributes({ url: v })}
                      className={cn(
                        "relative overflow-hidden rounded-[var(--radius-btn)] border-2 transition-colors focus-ring",
                        v === url ? "border-accent ring-2 ring-accent/20" : "border-border hover:border-accent/50",
                      )}
                    >
                      <span className="num absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ink)] text-[10px] font-semibold text-[var(--paper)]">
                        {i + 1}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v} alt={`Variation ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <input
              value={caption}
              onChange={(e) => updateAttributes({ caption: e.target.value })}
              onMouseDown={stop}
              placeholder="Caption (optional)"
              className="w-full bg-transparent text-center text-sm text-text-mute focus:outline-none"
            />
            <button
              type="button"
              disabled={generating}
              onMouseDown={stop}
              onClick={() => generate()}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[var(--radius-btn)] border border-border text-xs font-medium text-text-mute hover:bg-surface-2 focus-ring disabled:opacity-60"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Regenerate {variationCount} variations
            </button>
          </>
        )}
        {error ? <p className="text-center text-[11px] text-[var(--down)]">{error}</p> : null}
        <p className="t-meta text-center text-[10px]">Powered by Napkin AI · uses your Napkin account credits</p>
      </div>
    </NodeViewWrapper>
  );
}
