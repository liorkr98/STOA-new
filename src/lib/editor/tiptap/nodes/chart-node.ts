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
      ticker: { default: "" },
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
