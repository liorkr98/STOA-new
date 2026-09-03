/**
 * A frame that fills the room its scroller gives it.
 *
 * Several surfaces want a column that stays in view while another scrolls:
 * the compose rail beside the canvas, the clip beside a report, the lists
 * beside Today, the live preview beside the branding form. The way to get
 * that is not `position: sticky` with an offset guessed from the nav's
 * height: inside the app shell the scroller is <main>, and a sticky offset
 * there is taken from the column's padding-inset edge, so the element sits
 * lower than the number says and covers what follows.
 *
 * Instead the surface becomes a frame exactly as tall as the room below
 * whatever sits above it in the scroller, and its columns scroll on their
 * own. Nothing is pinned to anything, so nothing can be pinned wrongly.
 * The room is measured, never assumed from the nav, the bar or the window.
 */

/** The nearest ancestor that scrolls vertically, or the document itself. */
export function scrollParent(el: HTMLElement): HTMLElement {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

const px = (v: string) => parseFloat(v) || 0;

/**
 * How tall the frame can be so that it ends exactly at the bottom of the
 * scroller's room: the scroller's inner height, less what sits above the
 * frame (the scroller's own top padding, a heading, a masthead), less the
 * scroller's bottom padding, plus whatever the ancestors between the two
 * already reclaim beneath it with negative margins (the shell's breakout).
 */
export function frameHeight(root: HTMLElement, scroller: HTMLElement): number {
  const cs = getComputedStyle(scroller);
  const isDocument =
    scroller === document.documentElement || scroller === document.scrollingElement;
  // The scroller's padding-box top, in viewport terms. The document's is the
  // viewport's own top; an element's rect does not move as its content
  // scrolls, so its scrollTop is added back to place the frame in content.
  const scrollerTop = isDocument ? 0 : scroller.getBoundingClientRect().top + px(cs.borderTopWidth);
  const rootTop =
    root.getBoundingClientRect().top + (isDocument ? window.scrollY : scroller.scrollTop);
  const above = rootTop - scrollerTop;
  let h = scroller.clientHeight - px(cs.paddingBottom) - above;
  let node = root.parentElement;
  while (node && node !== scroller) {
    const m = getComputedStyle(node);
    h -= px(m.marginBottom) + px(m.paddingBottom) + px(m.borderBottomWidth);
    node = node.parentElement;
  }
  return Math.max(0, Math.floor(h));
}

/** A column inside a frame: it scrolls on its own and clears the phone tab bar. */
export const SCROLL_COLUMN = "scroll-area min-h-0 min-w-0 overflow-y-auto pb-[var(--tab-h)]";
