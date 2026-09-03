/**
 * The compose frame's geometry.
 *
 * Compose fills whatever is scrolling it and lets its own columns scroll
 * inside that. For the frame to be exactly as tall as the room it has, the
 * room is measured: the scroller's inner height, less the scroller's own
 * padding, plus whatever the ancestors between the two already reclaim with
 * negative margins (the app shell's breakout does this to cancel the page
 * gutter). Nothing here assumes the nav's height, the bar's height, or that
 * the scroller is the window.
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

/** How tall the frame can be without making its scroller scroll. */
export function frameHeight(root: HTMLElement, scroller: HTMLElement): number {
  const cs = getComputedStyle(scroller);
  let h = scroller.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
  let node = root.parentElement;
  while (node && node !== scroller) {
    const m = getComputedStyle(node);
    h -=
      px(m.marginTop) +
      px(m.marginBottom) +
      px(m.paddingTop) +
      px(m.paddingBottom) +
      px(m.borderTopWidth) +
      px(m.borderBottomWidth);
    node = node.parentElement;
  }
  return Math.max(0, Math.floor(h));
}
