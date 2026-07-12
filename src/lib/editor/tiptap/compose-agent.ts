import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import type { ComposeAgentAction } from "@/lib/ai/compose-actions";
import { NAPKIN_CHART_STYLE_ID } from "@/lib/napkin/styles";
import {
  insertVisualizedFromSelection,
  type VisualizeMode,
} from "@/lib/editor/tiptap/chart-from-selection";
import { applyReportTemplateToEditor } from "@/lib/editor/tiptap/apply-report-template";

export interface ComposeEditorContext {
  reportTicker?: string;
  selection?: string;
  peers?: string[];
}

function textNode(text: string) {
  return { type: "text" as const, text };
}

function paragraph(text: string): JSONContent {
  return { type: "paragraph", content: text ? [textNode(text)] : [] };
}

function insertAtCursor(editor: Editor, nodes: JSONContent | JSONContent[]) {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  return editor.chain().focus().insertContent(list).run();
}

function runAction(
  editor: Editor,
  action: ComposeAgentAction,
  ctx: ComposeEditorContext,
): string | null {
  const ticker = (action.ticker ?? ctx.reportTicker ?? "").toUpperCase();
  const text = action.text?.trim() ?? "";

  switch (action.action) {
    case "replace_selection": {
      if (!ctx.selection?.trim() || !text) return null;
      const { from, to } = editor.state.selection;
      if (from === to) return null;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(paragraph(text))
        .run();
      return "Replaced selection";
    }

    case "visualize_selection": {
      if (!ctx.selection?.trim()) return null;
      const mode: VisualizeMode = action.visualizeMode ?? "both";
      const range = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      };
      const result = insertVisualizedFromSelection(editor, ctx.reportTicker, range, mode);
      if (result.error) throw new Error(result.error);
      return `Visualized (${mode})`;
    }

    case "insert_heading":
      insertAtCursor(editor, {
        type: "heading",
        attrs: { level: 2 },
        content: text ? [textNode(text)] : [],
      });
      return text ? `Heading: ${text.slice(0, 40)}` : "Heading";

    case "insert_subheading":
      insertAtCursor(editor, {
        type: "heading",
        attrs: { level: 3 },
        content: text ? [textNode(text)] : [],
      });
      return "Subheading";

    case "insert_paragraph":
      insertAtCursor(editor, paragraph(text || " "));
      return "Paragraph";

    case "insert_callout":
      insertAtCursor(editor, {
        type: "callout",
        content: text ? [textNode(text)] : [],
      });
      return "Callout";

    case "insert_quote":
      insertAtCursor(editor, {
        type: "blockquote",
        content: [paragraph(text || " ")],
      });
      return "Quote";

    case "insert_divider":
      insertAtCursor(editor, { type: "horizontalRule" });
      return "Divider";

    case "insert_bullet_list":
      insertAtCursor(editor, {
        type: "bulletList",
        content: [{ type: "listItem", content: [paragraph(text || "Point")] }],
      });
      return "Bulleted list";

    case "insert_numbered_list":
      insertAtCursor(editor, {
        type: "orderedList",
        content: [{ type: "listItem", content: [paragraph(text || "Point")] }],
      });
      return "Numbered list";

    case "insert_chart":
      insertAtCursor(editor, {
        type: "chartNode",
        attrs: {
          ticker,
          range: action.range ?? "3M",
          kind: "area",
          engine: "lightweight",
        },
      });
      return ticker ? `${ticker} chart` : "Chart";

    case "insert_tradingview_chart":
      insertAtCursor(editor, {
        type: "chartNode",
        attrs: {
          ticker,
          range: action.range ?? "3M",
          kind: "candles",
          engine: "tradingview",
        },
      });
      return ticker ? `${ticker} TradingView` : "TradingView chart";

    case "insert_diagram":
      insertAtCursor(editor, {
        type: "napkinNode",
        attrs: {
          sourceText: text || ctx.selection || "Key points from the report",
          provider: "open",
          styleId: NAPKIN_CHART_STYLE_ID,
          autoGenerate: true,
          chartMode: false,
        },
      });
      return "Diagram (generating…)";

    case "insert_figure":
      insertAtCursor(editor, { type: "dataFigureNode" });
      return "Data figure";

    case "insert_compare": {
      const symbols = action.tickers?.length
        ? action.tickers.map((x) => x.toUpperCase()).slice(0, 4)
        : ticker
          ? [ticker]
          : ["NVDA", "AMD"];
      while (symbols.length < 2) symbols.push("PEER");
      insertAtCursor(editor, {
        type: "compareNode",
        attrs: {
          tickers: symbols.slice(0, 4),
          rows: [
            { label: "P/E", values: symbols.map(() => "") },
            { label: "Rev growth", values: symbols.map(() => "") },
            { label: "Gross margin", values: symbols.map(() => "") },
          ],
        },
      });
      return `Peer table (${symbols.slice(0, 4).join(", ")})`;
    }

    case "insert_table":
      insertAtCursor(editor, { type: "financialTableNode" });
      return "Table";

    case "insert_statement":
      insertAtCursor(editor, {
        type: "statementNode",
        attrs: { ticker, kind: "income", years: 5 },
      });
      return ticker ? `${ticker} financials` : "Financial statement";

    case "insert_estimates":
      insertAtCursor(editor, { type: "estimatesNode", attrs: { ticker } });
      return ticker ? `${ticker} estimates` : "Estimates";

    case "insert_comparison": {
      const symbols = action.tickers?.length
        ? action.tickers.map((t) => t.toUpperCase())
        : ticker
          ? [ticker]
          : [];
      insertAtCursor(editor, {
        type: "comparisonNode",
        attrs: { symbols, metric: "revenue", years: 5, kind: "line" },
      });
      return "Metric comparison";
    }

    case "insert_valuation":
      insertAtCursor(editor, { type: "valuationNode", attrs: { ticker } });
      return ticker ? `${ticker} valuation` : "Valuation";

    case "insert_scenario":
      insertAtCursor(editor, { type: "scenarioNode" });
      return "Scenario";

    case "insert_embed":
      insertAtCursor(editor, {
        type: "embedNode",
        attrs: action.url ? { url: action.url } : {},
      });
      return "Embed";

    case "insert_image":
      insertAtCursor(editor, { type: "imageNode" });
      return "Image";

    case "insert_video":
      insertAtCursor(editor, { type: "videoNode" });
      return "Video";

    case "insert_formula":
      editor
        .chain()
        .focus()
        .insertBlockMath({
          latex: text || "FV = \\sum_{t=1}^{N} \\frac{FCF_t}{(1+r)^t}",
        })
        .run();
      return "Formula";

    case "apply_template": {
      const id = action.templateId ?? "initiating-coverage";
      const peers =
        action.tickers?.map((x) => x.toUpperCase()).filter((x) => x && x !== ticker) ??
        ctx.peers ??
        [];
      const ok = applyReportTemplateToEditor(editor, id, {
        ticker: ticker || undefined,
        peers,
      });
      return ok ? `Template: ${id}` : null;
    }

    default:
      return null;
  }
}

export function executeComposeActions(
  editor: Editor,
  actions: ComposeAgentAction[],
  ctx: ComposeEditorContext,
): { applied: string[]; errors: string[] } {
  const applied: string[] = [];
  const errors: string[] = [];

  for (const action of actions) {
    try {
      const label = runAction(editor, action, ctx);
      if (label) applied.push(label);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Action failed");
    }
  }

  return { applied, errors };
}

export function actionsToPreviewLabels(actions: ComposeAgentAction[]): string[] {
  return actions.map((a) => {
    const t = a.ticker?.toUpperCase();
    switch (a.action) {
      case "insert_chart":
        return t ? `${t} chart` : "Chart";
      case "insert_tradingview_chart":
        return t ? `${t} TradingView` : "TradingView";
      case "insert_diagram":
        return "AI diagram";
      case "visualize_selection":
        return `Visualize (${a.visualizeMode ?? "both"})`;
      case "replace_selection":
        return "Replace selection";
      case "apply_template":
        return `Template (${a.templateId ?? "initiating-coverage"})`;
      default:
        return a.action.replace(/^insert_/, "").replace(/_/g, " ");
    }
  });
}
