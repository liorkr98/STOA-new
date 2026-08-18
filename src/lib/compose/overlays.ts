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
  | { type: "card"; label: string }
  | { type: "figure"; label: string; imageUrl: string | null }
  | { type: "chart"; ticker: string }
  | { type: "upload"; label: string; imageUrl: string | null };

export interface VisualOverlay {
  id: string;
  kind: "visual";
  start: number;
  end: number;
  source: VisualSource;
  /** Full-frame cutaway hides the picture (audio continues); inset sits over part of the frame. */
  mode: "cutaway" | "inset";
  /** Only meaningful for inset. */
  position: GridPosition;
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

export function sourceLabel(s: VisualSource): string {
  switch (s.type) {
    case "card":
      return `Card · ${s.label}`;
    case "figure":
      return `Figure · ${s.label}`;
    case "chart":
      return `Live chart · ${s.ticker}`;
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
