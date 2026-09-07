/**
 * Video overlays (not "cards": cards are the separate swipeable evidence
 * stack). Timed text and visual events on two tracks over the analyst's
 * video.
 *
 * They are stored with the publication (`reports.video_edit`, migration 0064)
 * and drawn by Stoa's player at playback, from the same renderer the editor's
 * faithful preview uses, so what the creator sees is what plays on the site.
 * They are not composited into the video file: no burn-in worker exists. A
 * clip shared or downloaded elsewhere plays without them, and the editor says
 * so where the overlays are placed.
 */

/** Nine-point grid position: 1 top-left ... 5 centre ... 9 bottom-right. */
export type GridPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type TextSize = "sm" | "md" | "lg";

export interface TextOverlay {
  id: string;
  kind: "text";
  start: number;
  end: number;
  text: string;
  position: GridPosition;
  size: TextSize;
}

export type VisualSource =
  /** A real card from the publication's deck. `label` is a fallback name for
   *  when the card has been deleted out from under the placement. */
  | { type: "card"; cardId: string | null; label: string }
  | { type: "figure"; label: string; imageUrl: string | null }
  | { type: "chart"; ticker: string; compareTicker?: string }
  | { type: "diagram"; prompt: string; imageUrl: string | null }
  | { type: "upload"; label: string; imageUrl: string | null };

export interface VisualOverlay {
  id: string;
  kind: "visual";
  start: number;
  end: number;
  source: VisualSource;
  /**
   * Full frame fills the picture with the visual, the video dimmed behind it
   * and the audio continuing; inset sits over part of the frame.
   */
  mode: "cutaway" | "inset";
  /** Only meaningful for inset. */
  position: GridPosition;
  /**
   * Inset width as a fraction of the picture's width; the height follows so
   * the box keeps its shape. Absent means the default box. Set by dragging
   * the box's corner on the picture.
   */
  size?: number;
  /** How solid the visual is, 0.2 to 1. In full frame the video shows through. */
  opacity?: number;
}

export const INSET_DEFAULT_SIZE = 0.46;
export const INSET_MIN_SIZE = 0.2;
/** Large enough to dominate the frame, small enough to stay inside it from any of the nine anchors. */
export const INSET_MAX_SIZE = 0.84;
export const OVERLAY_MIN_OPACITY = 0.2;
/** The box has always been 46% wide by 42% tall; a resize keeps that shape. */
const INSET_ASPECT = 42 / 46;

export function insetSize(o: VisualOverlay): number {
  return clamp(o.size ?? INSET_DEFAULT_SIZE, INSET_MIN_SIZE, INSET_MAX_SIZE);
}

/** The inset's box, as percentages of the picture. */
export function insetBox(o: VisualOverlay): { width: string; height: string } {
  const w = insetSize(o);
  return { width: `${(w * 100).toFixed(2)}%`, height: `${(w * INSET_ASPECT * 100).toFixed(2)}%` };
}

export function overlayOpacity(o: VisualOverlay): number {
  return clamp(o.opacity ?? 1, OVERLAY_MIN_OPACITY, 1);
}

export type Overlay = TextOverlay | VisualOverlay;

export type Thumbnail = { type: "frame"; time: number } | { type: "upload"; url: string };

export interface VideoEdit {
  durationSeconds: number;
  trimStart: number;
  trimEnd: number;
  thumbnail: Thumbnail | null;
  overlays: Overlay[];
}

export const FRAME = 1 / 30;
export const MIN_EVENT = 0.5;

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function fmtTimecode(t: number): string {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, "0")}`;
}

/** Parses "0:12.4", "12.4", "1:02" into seconds; null when unreadable. */
export function parseTimecode(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length > 2) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n))) return null;
  return parts.length === 2 ? nums[0] * 60 + nums[1] : nums[0];
}

export function activeAt<T extends Overlay>(overlays: T[], t: number): T[] {
  return overlays.filter((o) => t >= o.start && t < o.end);
}

export function emptyEdit(durationSeconds: number): VideoEdit {
  return { durationSeconds, trimStart: 0, trimEnd: durationSeconds, thumbnail: null, overlays: [] };
}

/**
 * What is stored on the publication. The overlays and trim as edited, plus a
 * snapshot of the deck cards the overlays point at, so the player can draw a
 * card overlay from the edit alone. Thumbnail choice is not stored: nothing
 * applies it yet.
 */
export interface StoredVideoEdit {
  version: 1;
  durationSeconds: number;
  trimStart: number;
  trimEnd: number;
  overlays: Overlay[];
  cards: StoredOverlayCard[];
}

/** The card shape the player needs: the same as Compose's DraftCard. */
export interface StoredOverlayCard {
  id: string;
  kind: string;
  locked: boolean;
  payload: Record<string, unknown>;
}

/** True when the edit holds something a viewer would see. */
export function editHasOverlays(edit: { overlays: Overlay[] } | null | undefined): boolean {
  return Boolean(edit && edit.overlays.length > 0);
}

/**
 * The edit as it is stored. Null when there is nothing to store, so a
 * publication without overlays never writes the column at all.
 */
export function toStoredVideoEdit(
  edit: VideoEdit | null,
  deck: StoredOverlayCard[],
): StoredVideoEdit | null {
  if (!edit || edit.overlays.length === 0) return null;
  const wanted = new Set<string>();
  for (const o of edit.overlays) {
    if (o.kind === "visual" && o.source.type === "card" && o.source.cardId) wanted.add(o.source.cardId);
  }
  return {
    version: 1,
    durationSeconds: edit.durationSeconds,
    trimStart: edit.trimStart,
    trimEnd: edit.trimEnd,
    overlays: edit.overlays,
    cards: deck.filter((c) => wanted.has(c.id)).map((c) => ({ id: c.id, kind: c.kind, locked: c.locked, payload: c.payload })),
  };
}

/** Reads a stored edit back into the editor's shape; null when absent or unreadable. */
export function fromStoredVideoEdit(raw: unknown): VideoEdit | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<StoredVideoEdit>;
  if (!Array.isArray(e.overlays)) return null;
  const durationSeconds = typeof e.durationSeconds === "number" && e.durationSeconds > 0 ? e.durationSeconds : 90;
  return {
    durationSeconds,
    trimStart: typeof e.trimStart === "number" ? e.trimStart : 0,
    trimEnd: typeof e.trimEnd === "number" ? e.trimEnd : durationSeconds,
    thumbnail: null,
    overlays: e.overlays as Overlay[],
  };
}

/** The stored edit as the player reads it; null when absent or unreadable. */
export function readStoredVideoEdit(raw: unknown): StoredVideoEdit | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<StoredVideoEdit>;
  if (!Array.isArray(e.overlays) || e.overlays.length === 0) return null;
  return {
    version: 1,
    durationSeconds: typeof e.durationSeconds === "number" ? e.durationSeconds : 0,
    trimStart: typeof e.trimStart === "number" ? e.trimStart : 0,
    trimEnd: typeof e.trimEnd === "number" ? e.trimEnd : 0,
    overlays: e.overlays as Overlay[],
    cards: Array.isArray(e.cards) ? (e.cards as StoredOverlayCard[]) : [],
  };
}

/**
 * The label shown on the timeline block and in the picker. A card source is
 * resolved through `names` so the block follows the card's current name
 * instead of freezing whatever it was called when it was dropped.
 */
export function sourceLabel(s: VisualSource, names?: Map<string, string>): string {
  switch (s.type) {
    case "card":
      return `Card · ${(s.cardId && names?.get(s.cardId)) || s.label}`;
    case "figure":
      return `Figure · ${s.label}`;
    case "chart":
      return `Chart · ${s.ticker}${s.compareTicker ? ` · ${s.compareTicker}` : ""}`;
    case "diagram":
      return `Visualize · ${s.prompt.trim() || "Napkin"}`;
    case "upload":
      return `Upload · ${s.label}`;
  }
}

/** Percent offsets for a grid position, for absolutely positioned overlays. */
export function gridStyle(pos: GridPosition): { left: string; top: string; transform: string } {
  const col = (pos - 1) % 3;
  const row = Math.floor((pos - 1) / 3);
  const x = col === 0 ? "8%" : col === 1 ? "50%" : "92%";
  const y = row === 0 ? "10%" : row === 1 ? "50%" : "90%";
  const tx = col === 0 ? "0" : col === 1 ? "-50%" : "-100%";
  const ty = row === 0 ? "0" : row === 1 ? "-50%" : "-100%";
  return { left: x, top: y, transform: `translate(${tx}, ${ty})` };
}
