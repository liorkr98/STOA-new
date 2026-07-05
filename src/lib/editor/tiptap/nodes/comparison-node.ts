import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ComparisonNodeView } from "@/components/editor/tiptap/nodes/comparison-node-view";

/**
 * comparisonNode -- a fundamental metric compared across 2-8 tickers over time
 * (A6, Koyfin/FinChat-style). Distinct from compareNode (a manual peer table):
 * this auto-pulls a metric time series and charts it. The pulled series is
 * cached in node attrs at publish so readers render with no live fetch
 * (invariant #2).
 */
export const ComparisonNode = Node.create({
  name: "comparisonNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      symbols: { default: ["NVDA", "AMD"] },
      metric: { default: "revenue" },
      years: { default: 5 },
      kind: { default: "line" },
      comparison: { default: null },
      source: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-comparison-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-comparison-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ComparisonNodeView);
  },
});
