import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CompareNodeView } from "@/components/editor/tiptap/nodes/compare-node-view";

/**
 * compareNode -- a peer-comparison table (2-4 tickers x metrics). Tickers and
 * rows serialize as structured attributes into reports.body.
 */
export const CompareNode = Node.create({
  name: "compareNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      tickers: { default: ["NVDA", "AMD"] },
      rows: {
        default: [
          { label: "P/E", values: ["", ""] },
          { label: "Rev growth", values: ["", ""] },
          { label: "Gross margin", values: ["", ""] },
        ],
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-compare-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-compare-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CompareNodeView);
  },
});
