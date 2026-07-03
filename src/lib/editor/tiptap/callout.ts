import { Node, mergeAttributes } from "@tiptap/core";

/**
 * A calm callout block -- one line of emphasis, not a whole card. A stock
 * textblock node (content inline*), so the built-in `setNode`/`toggleNode`
 * commands drive it from the slash menu with no custom command plumbing.
 * Styling lives in globals.css (.stoa-callout), applied identically in the
 * editor and the reading view since both use this same extension set.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-callout": "", class: "stoa-callout" }),
      0,
    ];
  },
});
