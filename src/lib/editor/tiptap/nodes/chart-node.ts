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
      // Compare mode (Phase 2.3): 2-4 tickers, %-normalized. When set with
      // more than one symbol the node renders a comparison chart instead of a
      // single-symbol candles/line/area chart.
      tickers: { default: null },
      range: { default: "3M" },
      kind: { default: "area" },
      annotations: { default: [] },
      visibleRange: { default: null },
      screenshotUrl: { default: null },
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
