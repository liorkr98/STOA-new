import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dir: {
      setBlockDir: (dir: "ltr" | "rtl" | "auto") => ReturnType;
    };
  }
}

const DIR_BLOCKS = ["paragraph", "heading", "blockquote", "callout", "listItem"];

/**
 * Bidirectional text support (Phase 1.3). Every block carries a `dir`
 * attribute defaulting to "auto", so a Hebrew or Arabic paragraph renders
 * RTL automatically while an English one stays LTR -- mixed in one report.
 * The bubble toolbar's RTL/LTR toggle sets an explicit dir on the selected
 * block(s), overriding auto. UI chrome stays LTR; only content is bidi.
 */
export const Dir = Extension.create({
  name: "dir",

  addGlobalAttributes() {
    return [
      {
        types: DIR_BLOCKS,
        attributes: {
          dir: {
            default: "auto",
            parseHTML: (el) => el.getAttribute("dir") || "auto",
            renderHTML: (attrs) => (attrs.dir ? { dir: attrs.dir } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockDir:
        (dir) =>
        ({ state, tr, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isBlock && DIR_BLOCKS.includes(node.type.name)) {
              tr.setNodeAttribute(pos, "dir", dir);
              changed = true;
            }
          });
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
    };
  },
});
