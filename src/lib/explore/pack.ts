/**
 * Gap-free packing for the Explore wall.
 *
 * Tiles come in three sizes on a fixed-column grid: standard (1x1), medium
 * (2x1), spotlight (2x2). Sizes are decided by trending rank before packing;
 * this module only decides where each tile sits, with two hard rules: the grid
 * never shows an empty cell, and the last row is complete. Large tiles are
 * spread through the sequence (seeded by id, so the wall is stable between
 * renders and looks irregular rather than banded), then every tile is placed
 * at the first free cell it fits. Whatever cannot be placed without leaving a
 * hole is demoted to standard; whatever would leave the final row incomplete
 * is dropped. The tile count flexes to what packs cleanly.
 */

export type TileSize = "standard" | "medium" | "spotlight";

export interface PackInput {
  id: string;
  size: TileSize;
}

export interface Placed {
  id: string;
  size: TileSize;
  col: number;
  row: number;
  w: number;
  h: number;
}

const DIMS: Record<TileSize, [number, number]> = { standard: [1, 1], medium: [2, 1], spotlight: [2, 2] };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Interleave large tiles through the standard ones so they land at irregular
 * offsets: each large tile picks a slot from its own hash inside a window that
 * moves down the list, keeping rank order roughly (stronger items earlier).
 */
function interleave(items: PackInput[]): PackInput[] {
  const large = items.filter((t) => t.size !== "standard");
  const small = items.filter((t) => t.size === "standard");
  if (large.length === 0) return small;
  const out: PackInput[] = [...small];
  const stride = small.length / large.length;
  large.forEach((t, i) => {
    const base = Math.floor(i * stride + stride * 0.35);
    const jitter = hash(t.id) % Math.max(1, Math.min(Math.floor(stride), 4));
    // Later insertions shift earlier ones; account for the i already inserted.
    out.splice(Math.min(out.length, base + jitter + i), 0, t);
  });
  return out;
}

class Grid {
  private cells = new Map<string, string>();
  constructor(readonly cols: number) {}
  private key(c: number, r: number) {
    return `${c},${r}`;
  }
  free(c: number, r: number) {
    return !this.cells.has(this.key(c, r));
  }
  fits(c: number, r: number, w: number, h: number) {
    if (c + w > this.cols) return false;
    for (let dc = 0; dc < w; dc++) for (let dr = 0; dr < h; dr++) if (!this.free(c + dc, r + dr)) return false;
    return true;
  }
  take(id: string, c: number, r: number, w: number, h: number) {
    for (let dc = 0; dc < w; dc++) for (let dr = 0; dr < h; dr++) this.cells.set(this.key(c + dc, r + dr), id);
  }
  occupant(c: number, r: number) {
    return this.cells.get(this.key(c, r)) ?? null;
  }
  /** Earliest free cell in row-major order where a w x h block fits. */
  firstFit(w: number, h: number, maxRows: number): [number, number] | null {
    for (let r = 0; r < maxRows; r++) for (let c = 0; c <= this.cols - w; c++) if (this.fits(c, r, w, h)) return [c, r];
    return null;
  }
  rowFull(r: number) {
    for (let c = 0; c < this.cols; c++) if (this.free(c, r)) return false;
    return true;
  }
}

export function packTiles(items: PackInput[], cols: number, opts: { complete?: boolean } = {}): Placed[] {
  if (cols < 2) throw new Error("packTiles needs at least 2 columns");
  const seq = interleave(items);
  const grid = new Grid(cols);
  const maxRows = seq.length * 2 + 4;
  const placed: Placed[] = [];

  for (const t of seq) {
    let [w, h] = DIMS[t.size];
    let size = t.size;
    let spot = grid.firstFit(w, h, maxRows);
    // A large tile that would have to skip past holes it cannot fill is demoted:
    // if its first fit is not at the earliest free cell, try one size down.
    const earliest = grid.firstFit(1, 1, maxRows);
    if (spot && earliest && (spot[1] > earliest[1] + 1) && size !== "standard") {
      size = size === "spotlight" ? "medium" : "standard";
      [w, h] = DIMS[size];
      spot = grid.firstFit(w, h, maxRows);
    }
    if (!spot) continue;
    grid.take(t.id, spot[0], spot[1], w, h);
    placed.push({ id: t.id, size, col: spot[0], row: spot[1], w, h });
  }

  if (opts.complete === false) return placed;

  // Keep only rows that are completely filled and not straddled at the bottom.
  let lastFull = -1;
  for (let r = 0; r < maxRows; r++) {
    if (grid.rowFull(r)) lastFull = r;
    else break;
  }
  // A tile spanning below lastFull leaves the row above it "full" while the row
  // beneath is not; cut back to the last row nothing crosses out of.
  let cut = lastFull;
  while (cut >= 0) {
    const crosses = placed.some((p) => p.row <= cut && p.row + p.h - 1 > cut);
    if (!crosses) break;
    cut--;
  }
  return placed.filter((p) => p.row + p.h - 1 <= cut);
}

/** Cells covered by a layout, for tests and reporting. */
export function packedRows(placed: Placed[]): number {
  return placed.reduce((m, p) => Math.max(m, p.row + p.h), 0);
}
