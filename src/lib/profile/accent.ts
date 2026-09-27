import { formatHex, parse, wcagContrast } from "culori";

/**
 * Custom storefront accent (B1). Analysts get a free hue, but it is bounded:
 * it overrides only --accent (+ derived --accent-weak / --accent-ink), never
 * ink/paper/border/text, and it must clear WCAG AA against --paper or it is
 * rejected. Pure module -- safe on server and client.
 */

// --paper from globals.css (light / dark). Contrast is checked against both.
// This module runs on the server too, so it cannot read the CSS variables;
// keep these in step with globals.css (test:contrast checks they match).
export const PAPER_LIGHT = "#fafafa";
export const PAPER_DARK = "#0f1216";
const AA = 3; // AA for large text / UI accent surfaces vs the page background.

/** Parse any CSS color (hex, rgb, oklch, ...) to a hex string, or null. */
export function toHex(input: string): string | null {
  try {
    const parsed = parse(input.trim());
    if (!parsed) return null;
    return formatHex(parsed) ?? null;
  } catch {
    return null;
  }
}

/** Text color (ink or paper) that reads on top of the given accent. */
export function accentInk(hex: string): string {
  // --paper (light) and --ink (light), whichever reads better on the accent.
  const onDark = wcagContrast(hex, "#fafafa");
  const onLight = wcagContrast(hex, "#101418");
  return onDark >= onLight ? "#fafafa" : "#101418";
}

export interface AccentCheck {
  hex: string | null;
  valid: boolean;
  /** Lowest contrast ratio across light + dark paper. */
  contrast: number;
  reason?: string;
}

/** Validate an accent: parseable + clears AA vs paper in both themes. */
export function checkAccent(input: string): AccentCheck {
  const hex = toHex(input);
  if (!hex) return { hex: null, valid: false, contrast: 0, reason: "Not a valid color" };
  const cLight = wcagContrast(hex, PAPER_LIGHT);
  const cDark = wcagContrast(hex, PAPER_DARK);
  const contrast = Math.min(cLight, cDark);
  if (contrast < AA) {
    return {
      hex,
      valid: false,
      contrast,
      reason: "Too low contrast against the page - pick a deeper or more saturated hue",
    };
  }
  return { hex, valid: true, contrast };
}

/**
 * The scoped CSS-variable overrides for a storefront accent. Spread onto the
 * storefront wrapper's `style` so it cascades only to that subtree.
 */
export function accentVars(hex: string): Record<string, string> {
  return {
    "--accent": hex,
    "--accent-ink": accentInk(hex),
    "--accent-weak": `color-mix(in srgb, ${hex} 12%, transparent)`,
  };
}
