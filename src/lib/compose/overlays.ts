/**
 * Video overlays (not "cards": cards are the separate swipeable evidence
 * stack). Timed text and visual events on two tracks over the analyst's
 * video. They burn permanently into the video at publish, so the editor's
 * preview must be exactly what will ship.
 *
 * OVERLAYS_PLACEHOLDER: nothing stores overlays yet and no burn-in pipeline
 * exists (DECISION REQUIRED in the build spec). The editor holds them in
 * memory; see the backend brief for what publishing them needs.
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
