import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CardNodeView } from "@/components/editor/tiptap/nodes/card-node-view";

/**
 * cardNode -- an evidence card placed inline in the research body.
 *
 * Only the card id is serialized into reports.body. The card itself lives in
 * publication_cards, so the same card can also sit on the video's visual track
 * without being copied, and editing it once updates both. A body that outlives
 * its card renders a missing-card placeholder rather than throwing.
 */
export const CardNode = Node.create({
  name: "cardNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      cardId: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-card-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-card-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardNodeView);
  },
});
