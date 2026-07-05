import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EmbedNodeView } from "@/components/editor/tiptap/nodes/embed-node-view";

/**
 * embedNode -- X / YouTube / EDGAR filing / generic link as a static, cited
 * card (A9). Deliberately not a live iframe: feeds and reports stay fast,
 * private, and on-brand. The card links out; nothing third-party runs inline.
 */
export const EmbedNode = Node.create({
  name: "embedNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: "" },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-embed-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-embed-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView);
  },
});
