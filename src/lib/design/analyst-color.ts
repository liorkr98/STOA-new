/**
 * One stable colour per analyst, for generated placeholder thumbnails.
 *
 * Derived from the analyst's id rather than their handle or name: an id never
 * changes, so the same analyst is the same colour on every surface and stays
 * that colour if they rename themselves.
 *
 * The palette is muted and editorial so it sits on `--paper` without competing
 * with the type. It deliberately excludes the semantic hues: `--verdigris`
 * (Fact / Hit) and `--rust` (Contradicted / Miss) carry meaning in this product
 * and must never be spent on decoration. The sage and clay entries below are
 * held well away from both -- sage is greyer and lighter than verdigris, clay
 * is browner and softer than rust -- so a placeholder can never be misread as
 * a verdict.
 */

/** Base tones. Everything else is derived from these with `color-mix`. */
export const ANALYST_COLORS = [
  "#4A7C82", // dusty teal
  "#A8813C", // ochre
  "#A9705B", // clay
  "#5B6E8C", // slate blue
  "#7D8C6E", // sage
  "#6B5473", // plum
  "#55588A", // indigo
  "#8A7A45", // olive brass
] as const;

export type AnalystColor = (typeof ANALYST_COLORS)[number];

/**
 * FNV-1a over the id. Any stable hash would do; this one is short, has no
 * dependencies, and spreads sequential UUIDs across the palette evenly.
 */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Avalanche before the caller takes it modulo the palette length. Without
  // this the low bits carry too little of the input and short or similar ids
  // collapse onto a handful of colours.
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** The analyst's colour. Same input, same colour, everywhere, forever. */
export function analystColor(seed: string | null | undefined): AnalystColor {
  if (!seed) return ANALYST_COLORS[0];
  return ANALYST_COLORS[hash(seed) % ANALYST_COLORS.length];
}
