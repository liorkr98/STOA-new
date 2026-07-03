import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FinancialTableNodeView } from "@/components/editor/tiptap/nodes/financial-table-node-view";

/**
 * financialTableNode -- a structured data table (distinct from a prose
 * table). Columns/rows/source serialize as attributes into reports.body.
 */
export const FinancialTableNode = Node.create({
  name: "financialTableNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      columns: { default: ["Metric", "Value"] },
      rows: { default: [["", ""], ["", ""]] },
      source: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-financial-table-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-financial-table-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FinancialTableNodeView);
  },
});
