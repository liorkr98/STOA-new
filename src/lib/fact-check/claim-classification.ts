/**
 * Claim classification + persistence prep — steps 2-3 of the fact-checker
 * pipeline.
 *
 * Takes the raw claims from `claim-extraction.ts`, cross-checks numeric
 * claims against live market data (Yahoo Finance), maps the loose `ClaimType`
 * onto the DB's `claim_verdict` enum, and locates each claim's character
 * offsets in the source text so the frontend can highlight inline without
 * re-parsing. Pure functions except `crossCheckWithMarketData`, which is the
 * one step that needs a live quote.
 */

import { getQuote } from "@/lib/engine/market";
import type { ClaimType, RawClaim } from "./claim-extraction";
import type { ClaimVerdict } from "@/lib/types";

export interface ClassifiedClaim extends RawClaim {
  yahooCheck?: { match: boolean; detail: string } | null;
}

export interface ClaimRow {
  claim_text: string;
  verdict: ClaimVerdict;
  confidence: number | null;
  note: string | null;
  source_url: string | null;
  char_start: number;
  char_end: number;
}

const CONFIDENCE_MAP: Record<NonNullable<RawClaim["confidence"]>, number> = {
  high: 0.9,
  medium: 0.6,
  low: 0.3,
};

/** Cross-checks numeric price claims against a live quote, upgrading the verdict to Yahoo-Verified/Disputed. */
export async function crossCheckWithMarketData(claims: RawClaim[]): Promise<ClassifiedClaim[]> {
  const out: ClassifiedClaim[] = [];
  const cache = new Map<string, Awaited<ReturnType<typeof getQuote>>>();

  for (const claim of claims) {
    let next: ClassifiedClaim = { ...claim };
    if (claim.verifiableTicker && claim.verifiableMetric === "price") {
      const sym = claim.verifiableTicker.toUpperCase();
      if (!cache.has(sym)) cache.set(sym, await getQuote(sym));
      const quote = cache.get(sym)!;
      const m = claim.text.match(/\$?([\d,]+\.?\d*)/);
      if (m && quote.price) {
        const claimed = Number.parseFloat(m[1].replace(/,/g, ""));
        const diff = Math.abs(claimed - quote.price) / quote.price;
        const match = diff < 0.08;
        next = {
          ...next,
          type: match ? "Yahoo-Verified" : "Yahoo-Disputed",
          yahooCheck: {
            match,
            detail: match
              ? `Close to live $${quote.price.toFixed(2)}`
              : `Live price $${quote.price.toFixed(2)} differs from claim`,
          },
        };
      }
    }
    out.push(next);
  }
  return out;
}

/** Maps the display-oriented `ClaimType` onto the DB's `claim_verdict` enum. */
export function mapVerdict(type: ClaimType): ClaimVerdict {
  switch (type) {
    case "Fact":
    case "Yahoo-Verified":
      return "fact";
    case "Opinion":
      return "opinion";
    case "Misleading":
    case "Yahoo-Disputed":
      return "contradicted";
    default:
      return "unproven";
  }
}

/** Locates a claim's exact character offsets in the source text. Falls back to [0, 0] (start of document) if the LLM paraphrased instead of quoting verbatim, so persistence never fails outright. */
export function locateOffsets(sourceText: string, claimText: string): { char_start: number; char_end: number } {
  const idx = sourceText.indexOf(claimText);
  if (idx === -1) return { char_start: 0, char_end: 0 };
  return { char_start: idx, char_end: idx + claimText.length };
}

/** Converts classified claims into rows ready to insert into the `claims` table. */
export function toClaimRows(sourceText: string, claims: ClassifiedClaim[]): ClaimRow[] {
  return claims.map((c) => {
    const { char_start, char_end } = locateOffsets(sourceText, c.text);
    return {
      claim_text: c.text,
      verdict: mapVerdict(c.type),
      confidence: c.confidence ? CONFIDENCE_MAP[c.confidence] : null,
      note: c.note ?? c.yahooCheck?.detail ?? null,
      source_url: null,
      char_start,
      char_end,
    };
  });
}
