/**
 * Dragging a card out of the tray.
 *
 * A private MIME type rather than text/plain, so a card dragged over the
 * research body is recognised as a card and not pasted as its id, and so a
 * drop target can decide whether to highlight before the drop happens
 * (dataTransfer values are unreadable during dragover, but the type list is
 * not).
 */
export const CARD_DRAG_TYPE = "application/x-stoa-card";

export function isCardDrag(e: { dataTransfer: DataTransfer | null }): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes(CARD_DRAG_TYPE);
}

export function readCardDrag(e: { dataTransfer: DataTransfer | null }): string | null {
  return e.dataTransfer?.getData(CARD_DRAG_TYPE) || null;
}
