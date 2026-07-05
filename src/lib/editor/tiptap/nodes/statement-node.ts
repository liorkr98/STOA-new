import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { StatementNodeView } from "@/components/editor/tiptap/nodes/statement-node-view";

/**
 * statementNode -- an EDGAR-powered financial statement (income / balance /
 * cash flow), the flagship ledger block (A4). The pulled statement is cached in
 * the `statement` attribute at publish so a reader renders it without any live
 * fetch (invariant #2, mirrors chartNode.screenshotUrl). Every figure carries
 * its filing provenance via `source`.
 */
export const StatementNode = Node.create({
  name: "statementNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      ticker: { default: "" },
      kind: { default: "income" },
      years: { default: 5 },
      hiddenRows: { default: [] },
      rowOrder: { default: null },
      showYoY: { default: true },
      showCagr: { default: false },
      // Cached FinancialStatement (from @/lib/market types) baked at publish.
      statement: { default: null },
      source: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-statement-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-statement-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StatementNodeView);
  },
});
