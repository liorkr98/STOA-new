import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    opinion: {
      toggleOpinion: () => ReturnType;
    };
  }
}

/**
 * "Mark as opinion" (Phase 1.2). Tags a span of text the analyst is stating as
 * a judgement, not a fact -- rendered as a plum-underlined span in both the
 * editor and the reading view. The reading-view debate tie (a scoped thread on
 * the marked claim) is wired with the fact-check layer in Phase 3; this is the
 * mark it hangs on.
 */
export const OpinionMark = Mark.create({
  name: "opinion",

  parseHTML() {
    return [{ tag: "span[data-opinion]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-opinion": "", class: "stoa-opinion" }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleOpinion:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
