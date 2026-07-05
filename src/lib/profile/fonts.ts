import type { ProfileConfig } from "@/lib/editor/types";

/**
 * Storefront font pairings (B2). Bounded creator freedom: each pairing remaps
 * only --font-display among the faces the app already loads (Fraunces, IBM Plex
 * Sans, IBM Plex Mono) -- no arbitrary uploads, no new font downloads, body and
 * UI faces stay locked. Applied as scoped vars on the storefront wrapper.
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
    label: "Ledger",
    description: "Fraunces display - the Stoa default",
    vars: {},
  },
  {
    id: "modern",
    label: "Modern",
    description: "Plex Sans display - clean and technical",
    vars: { "--font-display": "var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif" },
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Fraunces display and body - magazine read",
    vars: { "--font-sans": "var(--font-fraunces), ui-serif, Georgia, serif" },
  },
  {
    id: "mono",
    label: "Mono accent",
    description: "Plex Mono display - terminal flavor",
    vars: { "--font-display": "var(--font-plex-mono), ui-monospace, monospace" },
  },
];

export function fontPairingVars(id: FontPairingId | undefined): Record<string, string> {
  return FONT_PAIRINGS.find((p) => p.id === id)?.vars ?? {};
}
