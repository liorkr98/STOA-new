import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ScenarioNodeView } from "@/components/editor/tiptap/nodes/scenario-node-view";

/**
 * scenarioNode -- bull / base / bear x price x probability (A2). Probabilities
 * must sum to 100. Produces a probability-weighted target + expected upside and
 * can drive the Lock & Publish target (mutually exclusive with valuationNode).
 * The computed result is cached in attrs at publish (invariant #2).
 */
export const ScenarioNode = Node.create({
  name: "scenarioNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      ticker: { default: "" },
      cases: {
        default: [
          { label: "Bull", price: 0, probability: 25 },
          { label: "Base", price: 0, probability: 50 },
          { label: "Bear", price: 0, probability: 25 },
        ],
      },
      lastPrice: { default: null },
      drivesTarget: { default: false },
      computed: { default: null },
      source: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-scenario-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-scenario-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ScenarioNodeView);
  },
});
