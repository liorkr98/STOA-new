import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ValuationNodeView } from "@/components/editor/tiptap/nodes/lazy-node-views";

/**
 * valuationNode -- a DCF in one block (A1). Inputs left, output card right (fair
 * value/share, upside, PV-by-year, 5x5 sensitivity). Math lives in the pure,
 * tested src/lib/valuation/model.ts (decimal.js); the computed result is cached
 * in `computed` at publish (invariant #2). When `drivesTarget` is on it feeds
 * the Lock & Publish target and renders as a trust-critical ledger card
 * (mutually exclusive with scenarioNode).
 */
export const ValuationNode = Node.create({
  name: "valuationNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      ticker: { default: "" },
      fcf: { default: [] },
      wacc: { default: 0.09 },
      terminalMethod: { default: "gordon" },
      growth: { default: 0.025 },
      exitMetric: { default: 0 },
      exitMultiple: { default: 12 },
      netDebt: { default: 0 },
      dilutedShares: { default: 0 },
      lastPrice: { default: null },
      drivesTarget: { default: false },
      computed: { default: null },
      source: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-valuation-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-valuation-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ValuationNodeView);
  },
});
