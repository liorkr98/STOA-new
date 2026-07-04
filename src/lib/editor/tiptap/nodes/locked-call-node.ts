import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { LockedCallNodeView } from "@/components/editor/tiptap/nodes/locked-call-node-view";

/**
 * lockedCallNode (Phase 1.4). Exactly one per report, present by default,
 * pinned first -- not in the slash menu (you can't insert a second). Attrs
 * are synced one-way from the Lock & Publish panel by StudioEditor.
 */
export const LockedCallNode = Node.create({
  name: "lockedCallNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      ticker: { default: "" },
      direction: { default: "long" },
      target: { default: null },
      horizonDays: { default: 30 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-locked-call]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-locked-call": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LockedCallNodeView);
  },
});
