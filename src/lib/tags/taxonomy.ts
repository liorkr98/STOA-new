/**
 * The publication tag taxonomy: a closed, curated list. One PRIMARY tag drives
 * discovery placement; up to two SECONDARY tags are searchable only; three in
 * total. Tags are data, not hard-coded strings in components, so the list can
 * change here (or move to a table) without touching the picker.
 *
 * The canonical list now lives in the `publication_tags` table (migration 0049),
 * which validates every write to `reports.primary_tag` / `secondary_tags`. This
 * file mirrors it for the picker's grouping and labels; keep the two in sync.
 */

export interface TagGroup {
  key: string;
  label: string;
  tags: PublicationTag[];
}

export interface PublicationTag {
  slug: string;
  label: string;
  /** Sector name from the instrument table this tag maps to, for auto-fill from a call. */
  sector?: string;
}

export const TAG_LIMITS = { primary: 1, secondary: 2, total: 3 } as const;

export const TAG_GROUPS: TagGroup[] = [
  {
    key: "sectors",
    label: "Sectors",
    tags: [
      { slug: "semiconductors", label: "Semiconductors", sector: "Semiconductors" },
      { slug: "software", label: "Software", sector: "Software" },
      { slug: "internet", label: "Internet", sector: "Internet" },
      { slug: "hardware", label: "Hardware", sector: "Hardware" },
      { slug: "financials", label: "Financials", sector: "Financials" },
      { slug: "healthcare", label: "Healthcare", sector: "Healthcare" },
      { slug: "consumer", label: "Consumer", sector: "Consumer" },
      { slug: "energy", label: "Energy", sector: "Energy" },
      { slug: "industrials", label: "Industrials", sector: "Industrials" },
      { slug: "materials", label: "Materials", sector: "Materials" },
      { slug: "media", label: "Media", sector: "Media" },
      { slug: "autos", label: "Autos", sector: "Autos" },
    ],
  },
  {
    key: "themes",
    label: "Themes",
    tags: [
      { slug: "ai-buildout", label: "AI buildout" },
      { slug: "memory", label: "Memory" },
      { slug: "grid-capex", label: "Grid capex" },
      { slug: "obesity-drugs", label: "Weight-loss drugs" },
      { slug: "payments", label: "Payments rails" },
      { slug: "energy-transition", label: "Energy transition" },
      { slug: "defense", label: "Defense" },
      { slug: "space", label: "Space" },
    ],
  },
  {
    key: "macro",
    label: "Macro",
    tags: [
      { slug: "rates", label: "Rates" },
      { slug: "fx", label: "FX" },
      { slug: "oil-energy", label: "Oil & energy" },
      { slug: "inflation", label: "Inflation" },
      { slug: "geopolitics", label: "Geopolitics" },
      { slug: "china", label: "China" },
      { slug: "israel", label: "Israel" },
      { slug: "credit", label: "Credit" },
    ],
  },
  {
    key: "formats",
    label: "Formats",
    tags: [
      { slug: "earnings", label: "Earnings" },
      { slug: "valuation", label: "Valuation" },
      { slug: "technicals", label: "Technicals" },
      { slug: "short-thesis", label: "Short thesis" },
      { slug: "event-driven", label: "Event-driven" },
      { slug: "ipo", label: "IPO / new listing" },
    ],
  },
];

export const ALL_TAGS: PublicationTag[] = TAG_GROUPS.flatMap((g) => g.tags);

export function tagBySlug(slug: string): PublicationTag | undefined {
  return ALL_TAGS.find((t) => t.slug === slug);
}

/** The sector tag for a sector name from the instrument table, for auto-fill. */
export function tagForSector(sector: string | null | undefined): PublicationTag | undefined {
  if (!sector) return undefined;
  const s = sector.trim().toLowerCase();
  return ALL_TAGS.find((t) => t.sector?.toLowerCase() === s);
}

/**
 * Display label for a theme chip on a callless publication. Prefers the stored
 * theme tag, then the primary tag, and finally the ticker's sector as the legacy
 * fallback for rows published before tags existed. An unrecognised slug still
 * renders (uppercased) rather than disappearing.
 */
export function themeLabel(
  input: { theme_tag?: string | null; primary_tag?: string | null },
  sectorFallback?: string | null,
): string | null {
  const slug = input.theme_tag ?? input.primary_tag ?? null;
  if (slug) return (tagBySlug(slug)?.label ?? slug).toUpperCase();
  return sectorFallback ? sectorFallback.toUpperCase() : null;
}
