import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EstimatesNodeView } from "@/components/editor/tiptap/nodes/estimates-node-view";

/**
 * estimatesNode -- consensus EPS estimates vs actuals (beat/miss) and the
 * analyst price-target range (A7), from Finnhub. The pulled data is cached in
 * node attrs at publish so readers render it with no live fetch (invariant #2).
 */
export const EstimatesNode = Node.create({
  name: "estimatesNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      ticker: { default: "" },
      estimates: { default: null },
      priceTarget: { default: null },
      source: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-estimates-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-estimates-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EstimatesNodeView);
  },
});
