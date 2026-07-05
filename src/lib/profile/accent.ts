import { formatHex, parse, wcagContrast } from "culori";

/**
 * Custom storefront accent (B1). Analysts get a free hue, but it is bounded:
 * it overrides only --accent (+ derived --accent-weak / --accent-ink), never
 * ink/paper/border/text, and it must clear WCAG AA against --paper or it is
 * rejected. Pure module -- safe on server and client.
 */

// Paper values from globals.css (light / dark). Contrast is checked against both.
const PAPER_LIGHT = "#eff1ed";
const PAPER_DARK = "#14171f";
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
  const onDark = wcagContrast(hex, "#f4f6f2");
  const onLight = wcagContrast(hex, "#0e1712");
  return onDark >= onLight ? "#f4f6f2" : "#0e1712";
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
