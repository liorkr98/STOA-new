/** Structured output from the AI brand analyzer. */

export interface BrandAnalyzeScores {
  clarity: number;
  credibility: number;
  discoverability: number;
  cta_strength: number;
}

export interface BrandSuggestion {
  field: "headline" | "bio" | "specialties" | "social";
  proposed: string | string[];
  reason: string;
}

export interface BrandAnalyzeResult {
  scores: BrandAnalyzeScores;
  suggestions: BrandSuggestion[];
  warnings: string[];
}

export interface BrandAnalyzeInput {
  display_name: string;
  headline: string | null;
  bio: string | null;
  specialties: string[];
  social: { label: string; url: string }[];
}
