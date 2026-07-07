"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Loader2, Pencil, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { DiagramRenderer } from "@/components/shared/OpenDiagram/DiagramRenderer";
import { OpenDiagramFrame } from "@/components/shared/OpenDiagram/OpenDiagramFrame";
import {
  DIAGRAM_IDS,
  DIAGRAM_THEMES,
  type BulletPoint,
  type DiagramId,
  type DiagramTheme,
} from "@/lib/diagram/schema";
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
  const provider = String(node.attrs.provider ?? "open") === "cloud" ? "cloud" : "open";
  const bulletPoints = (node.attrs.bulletPoints as BulletPoint[]) ?? [];
  const diagramId = (String(node.attrs.diagramId ?? "stacked") as DiagramId) || "stacked";
  const diagramTheme = (String(node.attrs.diagramTheme ?? "default") as DiagramTheme) || "default";
  const isRough = node.attrs.isRough !== false;
  const styleId = String(
    node.attrs.styleId ?? (chartMode ? NAPKIN_CHART_STYLE_ID : NAPKIN_DEFAULT_STYLE_ID),
  );
  const visualQuery = String(node.attrs.visualQuery ?? "");
  const widthPct = Number(node.attrs.widthPct ?? 100);
  const variationUrls = (node.attrs.variationUrls as string[]) ?? [];
  const autoGenerate = Boolean(node.attrs.autoGenerate);

  const [text, setText] = useState(sourceText);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const variationCount = chartMode ? NAPKIN_VARIATION_COUNT : 2;
  const hasBuiltIn = bulletPoints.length === 4;
  const hasDiagram = Boolean(url) || hasBuiltIn;

  const generateBuiltIn = useCallback(async () => {
    const content = text.trim();
    const res = await fetch("/api/ai/diagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = (await res.json()) as {
      error?: string;
      bulletPoints?: BulletPoint[];
    };
    if (!res.ok) {
      setError(data.error ?? "Diagram generation failed");
      return false;
    }
    if (!data.bulletPoints?.length) {
      setError("No diagram data returned");
      return false;
    }
    updateAttributes({
      provider: "open",
      bulletPoints: data.bulletPoints,
      sourceText: content,
      url: "",
      variationUrls: [],
      autoGenerate: false,
    });
    setEditing(false);
    return true;
  }, [text, updateAttributes]);

  const generateCloud = useCallback(async () => {
    const content = text.trim();
    const res = await fetch("/api/ai/napkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        style_id: styleId || (chartMode ? NAPKIN_CHART_STYLE_ID : NAPKIN_DEFAULT_STYLE_ID),
        visual_query: chartMode || variationCount > 1 ? undefined : visualQuery || undefined,
        format: "png",
        number_of_visuals: variationCount,
        context_before: chartMode ? `Annotated stock chart for ${chartTicker || "equity"}:` : undefined,
        context_after: chartMode ? "Show every price level as a labeled number on the chart." : undefined,
      }),
    });
    const data = (await res.json()) as { error?: string; visuals?: { url: string }[] };
    if (!res.ok) return false;
    const urls = (data.visuals ?? []).map((v) => v.url).filter(Boolean);
    if (urls.length === 0) return false;
    updateAttributes({
      provider: "cloud",
      url: urls[0],
      sourceText: content,
      variationUrls: urls,
      bulletPoints: [],
      autoGenerate: false,
    });
    setEditing(false);
    return true;
  }, [text, styleId, visualQuery, chartMode, chartTicker, variationCount, updateAttributes]);

  const generate = useCallback(async () => {
    const content = text.trim();
    if (!content) {
      setError("Add text to visualize");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      if (provider === "cloud" || chartMode) {
        const cloudOk = await generateCloud();
        if (cloudOk) return;
        if (provider === "cloud" && !chartMode) {
          setError("Cloud diagram unavailable — try built-in or set NAPKIN_API_KEY.");
          return;
        }
      }
      const ok = await generateBuiltIn();
      if (!ok && chartMode) {
        setError("Could not generate diagram. Set OPENAI_API_KEY for built-in, or NAPKIN_API_KEY for chart labels.");
      }
    } catch {
      setError("Generation failed — check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  }, [text, provider, chartMode, generateBuiltIn, generateCloud]);

  useEffect(() => {
    if (!autoGenerate || autoStarted.current || hasDiagram) return;
    if (!sourceText.trim()) return;
    autoStarted.current = true;
    void generate();
  }, [autoGenerate, sourceText, hasDiagram, generate]);

  const styleGroups = [...new Set(NAPKIN_STYLES.map((s) => s.group))];

  function DiagramPreview() {
    if (hasBuiltIn) {
      return (
        <OpenDiagramFrame bulletPoints={bulletPoints} theme={diagramTheme}>
          <DiagramRenderer
            diagramId={diagramId}
            theme={diagramTheme}
            isRough={isRough}
            width="100%"
            className="max-h-48 w-full"
          />
        </OpenDiagramFrame>
      );
    }
    if (url) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt={caption || "Diagram"}
          className="block w-full rounded-[var(--radius-btn)] border border-border"
        />
      );
    }
    return null;
  }

  if (!isEditable) {
    if (!hasDiagram) return <NodeViewWrapper contentEditable={false} className="hidden" />;
    return (
      <NodeViewWrapper contentEditable={false} role="figure" className="fade-up my-4">
        <div className="mx-auto" style={{ width: `${widthPct}%` }}>
          <DiagramPreview />
          {caption ? <p className="t-meta mt-1.5 text-center">{caption}</p> : null}
          <p className="t-meta mt-1 text-center text-[10px] text-text-faint">AI diagram</p>
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
          {chartMode ? `Chart diagram${chartTicker ? ` · ${chartTicker}` : ""}` : "AI diagram"}
        </span>
        {hasDiagram ? (
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
          aria-label="Delete diagram block"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="space-y-3 p-3">
        {generating && !hasDiagram ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 size={28} className="animate-spin text-accent" />
            <p className="text-sm font-medium text-text">Generating diagram from your selection…</p>
            <p className="max-w-sm text-xs text-text-mute line-clamp-4">{sourceText}</p>
          </div>
        ) : editing || !hasDiagram ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="t-meta text-[11px] text-text-mute">
                {hasDiagram ? "Edit the prompt and regenerate" : "Describe what the diagram should show"}
              </p>
              {hasDiagram && editing ? (
                <button
                  type="button"
                  onMouseDown={stop}
                  onClick={() => setEditing(false)}
                  className="flex h-7 items-center gap-1 rounded-[var(--radius-btn)] px-2 text-xs text-text-mute hover:bg-surface-2"
                >
                  <X size={14} />
                  Cancel
                </button>
              ) : null}
            </div>
            <label className="block">
              <span className="t-meta mb-1 block text-[11px]">Engine</span>
              <select
                value={provider}
                onChange={(e) => updateAttributes({ provider: e.target.value })}
                onMouseDown={stop}
                className="h-9 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm"
              >
                <option value="open">Built-in (OpenNapkin-style)</option>
                <option value="cloud">Cloud image (optional API key)</option>
              </select>
            </label>
            <label className="block">
              <span className="t-meta mb-1 block text-[11px]">Text to visualize</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onMouseDown={stop}
                rows={chartMode ? 6 : 4}
                placeholder="Edit levels, ticker, or thesis — the diagram redraws from your text."
                className="w-full resize-y rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
              />
            </label>
            {provider === "open" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="t-meta mb-1 block text-[11px]">Template</span>
                  <select
                    value={diagramId}
                    onChange={(e) => updateAttributes({ diagramId: e.target.value })}
                    onMouseDown={stop}
                    className="h-9 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm"
                  >
                    {DIAGRAM_IDS.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="t-meta mb-1 block text-[11px]">Theme</span>
                  <select
                    value={diagramTheme}
                    onChange={(e) => updateAttributes({ diagramTheme: e.target.value })}
                    onMouseDown={stop}
                    className="h-9 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm"
                  >
                    {DIAGRAM_THEMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-end gap-2 pb-1 text-sm">
                  <input
                    type="checkbox"
                    checked={isRough}
                    onChange={(e) => updateAttributes({ isRough: e.target.checked })}
                    onMouseDown={stop}
                    className="accent-[var(--accent)]"
                  />
                  Hand-drawn style
                </label>
              </div>
            ) : (
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
                ) : null}
              </div>
            )}
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
                  {hasDiagram ? "Regenerate diagram" : "Generate diagram"}
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto overflow-x-auto" style={{ width: `${widthPct}%` }}>
              <DiagramPreview />
            </div>
            {provider === "cloud" && variationUrls.length > 1 ? (
              <div>
                <p className="t-meta mb-2 text-center text-[11px] text-text-mute">Choose a variation</p>
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
            <div className="flex gap-2">
              <button
                type="button"
                disabled={generating}
                onMouseDown={stop}
                onClick={() => {
                  setText(sourceText);
                  setEditing(true);
                }}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-btn)] border border-border text-xs font-medium text-text-mute hover:bg-surface-2 focus-ring disabled:opacity-60"
              >
                <Pencil size={14} />
                Edit prompt
              </button>
              <button
                type="button"
                disabled={generating}
                onMouseDown={stop}
                onClick={() => generate()}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-btn)] border border-border text-xs font-medium text-text-mute hover:bg-surface-2 focus-ring disabled:opacity-60"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Regenerate
              </button>
            </div>
          </>
        )}
        {error ? <p className="text-center text-[11px] text-[var(--down)]">{error}</p> : null}
        <p className="t-meta text-center text-[10px]">
          Built-in diagrams use OPENAI_API_KEY · cloud engine uses NAPKIN_API_KEY if set
        </p>
      </div>
    </NodeViewWrapper>
  );
}
