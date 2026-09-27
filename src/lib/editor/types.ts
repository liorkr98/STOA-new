/** Block-based report document stored in report_bodies.body as JSON. */

export type BlockType =
  | "heading"
  | "text"
  | "chart"
  | "thesis"
  | "metrics"
  | "callout"
  | "divider";

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
}

export type BlockContent = Record<string, string | number | string[] | null | undefined>;

export interface ReportDocument {
  version: 1;
  blocks: EditorBlock[];
}

/** A retired storefront section, still stored on a few rows. Read by nothing. */
export interface ProfileSection {
  id: string;
  type: string;
  visible: boolean;
  data?: Record<string, unknown>;
}

export interface ProfileConfig {
  /** The analyst's one-word beat ("Semiconductors"), shown under their face on Today. */
  specialty?: string;
  /** Investor-side sector picks from onboarding. Shapes the Feed. */
  interests?: string[];
  /** Storefront font pairing id (B2). */
  font_pairing?: "ledger" | "modern" | "editorial" | "mono";
  /** Report pinned to the top of the public profile (set from Studio). */
  pinned_report_id?: string | null;
  /** Optional <=3% paper texture on the storefront only (B4). Default off. */
  texture?: boolean;
  /** Show the paying-member count beside followers in the public profile hero.
   * The analyst opts in; followers always show, members only when this is true.
   * These two numbers appear nowhere else on the platform. */
  show_member_count?: boolean;

  /*
   * Retired on 2026-09-27 with the storefront rebuild: the page shows none of
   * these, so the Storefront editor no longer offers them. A few rows still
   * carry them; nothing reads them.
   */
  theme_id?: string;
  banner_style?: string;
  sections?: ProfileSection[];
  specialties?: string[];
  social?: { label: string; url: string }[];
  featured_tickers?: string[];
  accent?: string;
  storefront_sections?: ProfileSection[];
  layout?: string;
}

export const BLOCK_META: Record<
  BlockType,
  { label: string; description: string; group: "text" | "finance" | "layout" }
> = {
  heading: { label: "Heading", description: "Section title", group: "text" },
  text: { label: "Text", description: "Paragraph body", group: "text" },
  callout: { label: "Callout", description: "Key insight highlight", group: "text" },
  chart: { label: "Chart", description: "Price chart for a ticker", group: "finance" },
  thesis: { label: "Thesis", description: "Bull vs bear case", group: "finance" },
  metrics: { label: "Metrics", description: "Key numbers grid", group: "finance" },
  divider: { label: "Divider", description: "Visual break", group: "layout" },
};
