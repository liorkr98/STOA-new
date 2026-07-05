import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DataFigureNodeView } from "@/components/editor/tiptap/nodes/data-figure-node-view";

/**
 * dataFigureNode -- a single sourced financial figure. Structured attributes
 * (label/value/note/source) serialize into reports.body, so the source
 * travels with the figure and feeds the fact-checker. This is what an AI
 * data card becomes when dragged in (Layer 4).
 */
export const DataFigureNode = Node.create({
  name: "dataFigureNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      label: { default: "" },
      value: { default: "" },
      note: { default: "" },
      // Manual/legacy source URL (kept for back-compat).
      source: { default: "" },
      // Structured provenance (A10): { kind, provider, url, asOf, accession, concept }.
      // Set when a figure is pulled from filings via "find in filings".
      sourceRef: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-figure-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-figure-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DataFigureNodeView);
  },
});
