import type { ProfileConfig } from "@/lib/editor/types";

/**
 * Storefront font pairings (B2). Bounded creator freedom: a pairing remaps only
 * --font-display among the faces the app already loads, on the storefront
 * wrapper. Direction B loads Bricolage Grotesque, Inter and JetBrains Mono;
 * mono is for tickers alone, so two pairings remain. "editorial" (Fraunces)
 * and "mono" (Plex Mono) were retired on 2026-09-27: their faces are no longer
 * loaded, and a storefront that saved one falls back to the default.
 */

export type FontPairingId = NonNullable<ProfileConfig["font_pairing"]>;

export interface FontPairing {
  id: FontPairingId;
  label: string;
  description: string;
  vars: Record<string, string>;
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "ledger",
    label: "Grotesque",
    description: "Bricolage Grotesque display, the Stoa default",
    vars: {},
  },
  {
    id: "modern",
    label: "Modern",
    description: "Inter display, quieter and technical",
    vars: { "--font-display": "var(--font-inter), var(--font-heebo), ui-sans-serif, system-ui, sans-serif" },
  },
];

export function fontPairingVars(id: FontPairingId | undefined): Record<string, string> {
  return FONT_PAIRINGS.find((p) => p.id === id)?.vars ?? {};
}
