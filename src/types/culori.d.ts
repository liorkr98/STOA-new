/**
 * Minimal ambient types for culori (used only by src/lib/profile/accent.ts:
 * parse, formatHex, wcagContrast). culori's shipped types didn't resolve
 * under this project's moduleResolution, so this is a small, exact-surface
 * declaration rather than a blanket `declare module "culori"`.
 */
declare module "culori" {
  export interface Color {
    mode: string;
    [channel: string]: number | string | undefined;
  }

  export function parse(input: string): Color | undefined;
  export function formatHex(color: Color | string): string;
  export function wcagContrast(a: Color | string, b: Color | string): number;
}
