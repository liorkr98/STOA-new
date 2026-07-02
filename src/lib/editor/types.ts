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

export interface ProfileSection {
  id: string;
  type: "bio" | "headline" | "specialties" | "social" | "featured";
  visible: boolean;
  data?: Record<string, unknown>;
}

export interface ProfileConfig {
  banner_style?: "gradient-accent" | "gradient-cool" | "minimal" | "cover";
  sections?: ProfileSection[];
  specialties?: string[];
  social?: { label: string; url: string }[];
  featured_tickers?: string[];
  /** Investor-side sector picks from onboarding. Shapes the Discover feed. */
  interests?: string[];
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
