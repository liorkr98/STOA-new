import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "@/components/editor/tiptap/nodes/image-node-view";

/**
 * imageNode -- a body image uploaded to Supabase storage (A8). The public URL,
 * alt text, caption, and width preset live in node attrs so the image renders
 * identically in the reader. Distinct from chartNode.screenshotUrl (a generated
 * chart image); this is an analyst-supplied figure.
 */
export const ImageNode = Node.create({
  name: "imageNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
      widthPct: { default: 100 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-image-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-image-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
