import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ChartNodeView } from "@/components/editor/tiptap/nodes/chart-node-view";

/**
 * chartNode -- a live price chart as a real, draggable, editable document
 * node (not an iframe). Structured attributes (ticker/range/kind) serialize
 * into reports.body, so the chart re-renders identically in the reading view
 * and the report stays queryable. Layer 3.
 */
export const ChartNode = Node.create({
  name: "chartNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      // Stable id so a chart's screenshot filename and capture registration
      // survive edits (assigned lazily by the node view if missing).
      nodeId: { default: null },
      ticker: { default: "" },
      range: { default: "3M" },
      kind: { default: "area" },
      annotations: { default: [] },
      visibleRange: { default: null },
      screenshotUrl: { default: null },
      /** SMA / RSI overlays parsed from selection or chosen in the toolbar. */
      indicators: { default: [] },
      /** Original analyst prose when the chart was created from a selection. */
      sourceText: { default: "" },
      /** TradingView study ids persisted from the toolbar (e.g. STD;RSI). */
      studies: { default: [] },
      /** lightweight = Lightweight Charts; tradingview = full TradingView Advanced Chart widget. */
      engine: { default: "lightweight" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-chart-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-chart-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});
