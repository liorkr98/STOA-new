import { nanoid } from "nanoid";
import type { Editor } from "@tiptap/react";
import type { ChartRange } from "@/lib/market/candle-types";
import type { ChartAnnotation } from "@/lib/market/chart-annotations";
import type { ChartIndicator } from "@/lib/market/chart-indicators";
import { detectTicker } from "@/lib/editor/tiptap/ticker-detect";

export interface ParsedChartIntent {
  ticker: string;
  range: ChartRange;
  kind: "candles" | "line" | "area";
  indicators: ChartIndicator[];
  annotations: ChartAnnotation[];
  sourceText: string;
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
      /(support|resistance|target|entry|stop|breakout|floor|ceiling)\s+(?:at|near|around|of|@)?\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
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

  return levels.slice(0, 6);
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

export function insertChartFromEditorSelection(
  editor: Editor,
  reportTicker?: string,
): string | null {
  const { from, to } = editor.state.selection;
  if (from === to) return "Select text first — we'll detect the ticker, levels, and indicators.";
  const selected = editor.state.doc.textBetween(from, to, "\n").trim();
  const intent = parseChartFromText(selected, reportTicker);
  if (!intent) {
    return "Couldn't find a ticker in your selection. Mention a symbol like AAPL or \$NVDA.";
  }

  editor
    .chain()
    .focus()
    .setTextSelection(to)
    .insertContent({
      type: "chartNode",
      attrs: {
        ticker: intent.ticker,
        range: intent.range,
        kind: intent.kind,
        indicators: intent.indicators,
        annotations: intent.annotations,
        sourceText: intent.sourceText,
      },
    })
    .run();

  return null;
}

/** Insert both a chart and Napkin visual from the same selection. */
export function insertVisualBundleFromSelection(
  editor: Editor,
  reportTicker?: string,
): string | null {
  const { from, to } = editor.state.selection;
  if (from === to) return "Select text first to visualize as a chart and a diagram.";
  const selected = editor.state.doc.textBetween(from, to, "\n").trim();
  if (!selected) return "Select text first to visualize as a chart and a diagram.";

  const intent = parseChartFromText(selected, reportTicker);
  const nodes: Record<string, unknown>[] = [];

  if (intent) {
    nodes.push({
      type: "chartNode",
      attrs: {
        ticker: intent.ticker,
        range: intent.range,
        kind: intent.kind,
        indicators: intent.indicators,
        annotations: intent.annotations,
        sourceText: intent.sourceText,
      },
    });
  }

  nodes.push({
    type: "napkinNode",
    attrs: { sourceText: selected, autoGenerate: true },
  });

  editor.chain().focus().setTextSelection(to).insertContent(nodes).run();
  return intent ? null : "No ticker detected — added Napkin diagram only. Add a symbol for the chart.";
}
