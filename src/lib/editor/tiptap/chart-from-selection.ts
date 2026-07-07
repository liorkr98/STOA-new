import { nanoid } from "nanoid";
import type { Editor } from "@tiptap/react";
import type { ChartRange } from "@/lib/market/candle-types";
import type { ChartAnnotation } from "@/lib/market/chart-annotations";
import type { ChartIndicator } from "@/lib/market/chart-indicators";
import { NAPKIN_CHART_STYLE_ID } from "@/lib/napkin/styles";
import { graphifyChartNote } from "@/lib/ai/graphify";
import { detectTicker } from "@/lib/editor/tiptap/ticker-detect";

export interface EditorRange {
  from: number;
  to: number;
}

export interface ParsedChartIntent {
  ticker: string;
  range: ChartRange;
  kind: "candles" | "line" | "area";
  indicators: ChartIndicator[];
  annotations: ChartAnnotation[];
  sourceText: string;
}

export type VisualizeMode = "chart" | "diagram" | "both";

export interface VisualizeResult {
  error?: string;
  warning?: string;
  ticker?: string;
  insertedChart: boolean;
  insertedNapkin: boolean;
}

function parseRange(text: string): ChartRange {
  const t = text.toLowerCase();
  if (/\b(1\s*d|one\s*day|intraday|today)\b/.test(t)) return "1D";
  if (/\b(1\s*w|one\s*week|weekly)\b/.test(t)) return "1W";
  if (/\b(5\s*y|five\s*year)\b/.test(t)) return "5Y";
  if (/\b(1\s*y|one\s*year|12\s*month|yearly)\b/.test(t)) return "1Y";
  if (/\b(3\s*m|three\s*month|quarter)\b/.test(t)) return "3M";
  if (/\b(1\s*m|one\s*month|monthly)\b/.test(t)) return "1M";
  return "3M";
}

function parseKind(text: string): "candles" | "line" | "area" {
  const t = text.toLowerCase();
  if (/\b(candle|ohlc|candlestick)\b/.test(t)) return "candles";
  if (/\b(line\s*chart|line)\b/.test(t)) return "line";
  return "candles";
}

function parseIndicators(text: string): ChartIndicator[] {
  const t = text.toLowerCase();
  const out: ChartIndicator[] = [];
  if (/\brsi\b/.test(t)) {
    const m = t.match(/rsi\s*\(?\s*(\d{1,2})\s*\)?/);
    out.push({ type: "rsi", period: m ? Number(m[1]) : 14 });
  }
  const smaMatches = [...t.matchAll(/(\d{2,3})\s*[-\s]?(?:day|d)?\s*(?:sma|moving\s+average|ma)\b/g)];
  for (const m of smaMatches) {
    const period = Number(m[1]);
    if (period >= 5 && period <= 300) out.push({ type: "sma", period });
  }
  if (/\b200\s*(?:sma|ma)\b/.test(t) && !out.some((i) => i.type === "sma" && i.period === 200)) {
    out.push({ type: "sma", period: 200 });
  }
  if (/\b50\s*(?:sma|ma)\b/.test(t) && !out.some((i) => i.type === "sma" && i.period === 50)) {
    out.push({ type: "sma", period: 50 });
  }
  return out;
}

function parsePriceLevels(text: string): ChartAnnotation[] {
  const levels: ChartAnnotation[] = [];
  const seen = new Set<number>();

  const labeled = [
    ...text.matchAll(
      /(support|resistance|target|entry|stop|breakout|floor|ceiling)\s+(?:at|near|around|of|@|is|was)?\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
    ),
  ];
  for (const m of labeled) {
    const price = Number(m[2].replace(/,/g, ""));
    if (!Number.isFinite(price) || seen.has(price)) continue;
    seen.add(price);
    levels.push({
      id: nanoid(8),
      kind: "hline",
      price,
      title: m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase(),
    });
  }

  const prices = [...text.matchAll(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g)];
  for (const m of prices) {
    const price = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(price) || price < 1 || seen.has(price)) continue;
    seen.add(price);
    levels.push({ id: nanoid(8), kind: "hline", price });
  }

  return levels.slice(0, 8);
}

/** Resolve selected prose from an explicit range snapshot or the live editor selection. */
export function resolveSelectionText(editor: Editor, range?: EditorRange | null): string | null {
  const from = range?.from ?? editor.state.selection.from;
  const to = range?.to ?? editor.state.selection.to;
  if (from === to) return null;
  const text = editor.state.doc.textBetween(from, to, "\n").trim();
  return text || null;
}

/** Parse analyst prose into a chart configuration (TradingView-style intent). */
export function parseChartFromText(text: string, reportTicker?: string): ParsedChartIntent | null {
  const sourceText = text.trim();
  if (!sourceText) return null;
  const ticker = detectTicker(sourceText, reportTicker);
  if (!ticker) return null;

  return {
    ticker,
    range: parseRange(sourceText),
    kind: parseKind(sourceText),
    indicators: parseIndicators(sourceText),
    annotations: parsePriceLevels(sourceText),
    sourceText,
  };
}

/** Napkin prompt that asks for a labeled stock chart with explicit price numbers. */
export function buildNapkinChartPrompt(intent: ParsedChartIntent, originalText: string): string {
  const hlines = intent.annotations.filter((a) => a.kind === "hline");
  const levelLines = hlines.map((a) => {
    const label = a.title ? `${a.title} at ` : "Level at ";
    return `- ${label}$${a.price.toFixed(a.price % 1 ? 2 : 0)}`;
  });

  const indicatorLines = intent.indicators.map((i) =>
    i.type === "rsi" ? `- RSI (${i.period})` : `- SMA ${i.period}`,
  );

  const note = graphifyChartNote(originalText, 220).text;

  return [
    `Stock chart: ${intent.ticker} (${intent.range}).`,
    "Candlestick/line price action. Label every level with exact $ price.",
    levelLines.length
      ? `Levels:\n${levelLines.join("\n")}`
      : "Support/resistance from note — label each with $ price.",
    indicatorLines.length ? `Overlays:\n${indicatorLines.join("\n")}` : "",
    `Note: ${note}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function insertAt(editor: Editor, pos: number, nodes: Record<string, unknown>[]): boolean {
  return editor.chain().focus().setTextSelection(pos).insertContent(nodes).run();
}

function buildChartNode(intent: ParsedChartIntent): Record<string, unknown> {
  const chartEngine = intent.annotations.length > 0 ? "lightweight" : "tradingview";
  return {
    type: "chartNode",
    attrs: {
      ticker: intent.ticker,
      range: intent.range,
      kind: intent.kind,
      engine: chartEngine,
      indicators: intent.indicators,
      annotations: intent.annotations,
      sourceText: intent.sourceText,
    },
  };
}

function buildDiagramNode(
  intent: ParsedChartIntent,
  selected: string,
  chartMode: boolean,
): Record<string, unknown> {
  return {
    type: "napkinNode",
    attrs: {
      sourceText: chartMode ? buildNapkinChartPrompt(intent, selected) : selected,
      chartTicker: chartMode ? intent.ticker : "",
      chartMode,
      styleId: NAPKIN_CHART_STYLE_ID,
      provider: "open",
      visualQuery: "",
      autoGenerate: true,
    },
  };
}

/**
 * Visualize from highlighted prose — chart only, diagram only, or both.
 */
export function insertVisualizedFromSelection(
  editor: Editor,
  reportTicker?: string,
  range?: EditorRange | null,
  mode: VisualizeMode = "both",
): VisualizeResult {
  const selected = resolveSelectionText(editor, range);
  if (!selected) {
    return {
      error: "Select text first — mention the stock and key levels (e.g. resistance at $140).",
      insertedChart: false,
      insertedNapkin: false,
    };
  }

  const needsTicker = mode === "chart" || mode === "both";
  const intent = needsTicker ? parseChartFromText(selected, reportTicker) : null;

  if (needsTicker && !intent) {
    return {
      error:
        "Couldn't find a stock symbol. Mention a ticker like $NVDA or AAPL, or set the report ticker in the publish panel.",
      insertedChart: false,
      insertedNapkin: false,
    };
  }

  const insertPos = range?.to ?? editor.state.selection.to;
  const nodes: Record<string, unknown>[] = [];

  if ((mode === "chart" || mode === "both") && intent) {
    nodes.push(buildChartNode(intent));
  }

  if (mode === "diagram") {
    nodes.push(buildDiagramNode(
      intent ?? {
        ticker: detectTicker(selected, reportTicker),
        range: "3M",
        kind: "candles",
        indicators: [],
        annotations: [],
        sourceText: selected,
      },
      selected,
      false,
    ));
  } else if (mode === "both" && intent) {
    nodes.push(buildDiagramNode(intent, selected, true));
  }

  const ok = insertAt(editor, insertPos, nodes);
  if (!ok) {
    return {
      error: "Couldn't insert blocks here. Try placing your cursor after a paragraph.",
      insertedChart: false,
      insertedNapkin: false,
    };
  }

  return {
    ticker: intent?.ticker,
    insertedChart: mode === "chart" || mode === "both",
    insertedNapkin: mode === "diagram" || mode === "both",
    warning:
      intent && intent.annotations.length === 0 && (mode === "chart" || mode === "both")
        ? "Chart added — no price levels detected. Mention levels like resistance at $140."
        : undefined,
  };
}

/** @deprecated Use insertVisualizedFromSelection */
export function insertVisualizedChartFromSelection(
  editor: Editor,
  reportTicker?: string,
  range?: EditorRange | null,
): VisualizeResult {
  return insertVisualizedFromSelection(editor, reportTicker, range, "both");
}

/** @deprecated Use insertVisualizedChartFromSelection */
export function insertChartFromEditorSelection(
  editor: Editor,
  reportTicker?: string,
  range?: EditorRange | null,
): string | null {
  const result = insertVisualizedChartFromSelection(editor, reportTicker, range);
  return result.error ?? result.warning ?? null;
}

/** @deprecated Use insertVisualizedChartFromSelection */
export function insertVisualBundleFromSelection(
  editor: Editor,
  reportTicker?: string,
  range?: EditorRange | null,
): string | null {
  const result = insertVisualizedChartFromSelection(editor, reportTicker, range);
  return result.error ?? result.warning ?? null;
}
