import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NapkinNodeView } from "@/components/editor/tiptap/nodes/napkin-node-view";

/**
 * napkinNode — AI-generated diagram/illustration via Napkin AI, hosted on
 * Supabase storage after server-side generation. Source text and style prefs
 * live in attrs for regenerate; url is the baked-in asset for readers.
 */
export const NapkinNode = Node.create({
  name: "napkinNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: "" },
      sourceText: { default: "" },
      caption: { default: "" },
      styleId: { default: "" },
      visualQuery: { default: "" },
      widthPct: { default: 100 },
      /** Alternate variation URLs when the analyst generated multiple options. */
      variationUrls: { default: [] as string[] },
      /** When true, generate immediately from sourceText on insert (selection flow). */
      autoGenerate: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-napkin-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-napkin-node": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NapkinNodeView);
  },
});
