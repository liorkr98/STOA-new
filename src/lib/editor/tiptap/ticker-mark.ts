import { Mark, markInputRule, mergeAttributes } from "@tiptap/core";

/**
 * tickerMark (H1) -- typing "$NVDA " converts to a live ticker tag. Serialized
 * as a mark with a ticker attr so the reader renders it identically (single
 * buildExtensions). The live hover card (price, change, sparkline) is attached
 * by TickerHoverLayer via the data attribute; the mark itself stays pure.
 * Never scored, never a call -- a reference, not a prediction.
 */
export const TickerMark = Mark.create({
  name: "tickerMark",
  inclusive: false,

  addAttributes() {
    return {
      ticker: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-ticker-mark]",
        getAttrs: (el) => ({ ticker: (el as HTMLElement).getAttribute("data-ticker-mark") ?? "" }),
      },
    ];
  },

  renderHTML({ mark, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-ticker-mark": String(mark.attrs.ticker ?? ""),
        class: "stoa-ticker num",
      }),
      0,
    ];
  },

  addInputRules() {
    return [
      markInputRule({
        // $NVDA followed by space/punctuation converts; the $ stays visible.
        find: /(?:^|\s)(\$[A-Z]{1,5})(?=[\s.,;:!?])/,
        type: this.type,
        getAttributes: (match) => ({ ticker: match[1].slice(1) }),
      }),
    ];
  },
});
