import "server-only";

import YahooFinance from "yahoo-finance2";
import { cachedPage } from "@/lib/cache/page";
import { toProviderSymbol } from "@/lib/markets/instruments";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"], queue: { concurrency: 4, interval: 100 } });

export type CompanyProfile = {
  industry: string | null;
  /** The provider's business summary cut to its first two sentences. */
  description: string | null;
  /** ISO date of the next earnings report, when one is scheduled. */
  nextEarnings: string | null;
  isEtf: boolean;
};

/** The first `n` sentences, never breaking on "Inc." or "U.S.". */
export function firstSentences(text: string, n = 2): string {
  const parts = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+(?=[A-Z])/);
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && /\b(?:Inc|Corp|Co|Ltd|U\.S|N\.A|S\.A|No|St)\.$/.test(out[out.length - 1]!)) {
      out[out.length - 1] += ` ${p}`;
      continue;
    }
    out.push(p);
    if (out.length >= n) break;
  }
  return out.slice(0, n).join(" ");
}

/** Industry, a two-sentence description and the next earnings date. Cached six hours. */
export async function getCompanyProfile(symbol: string): Promise<CompanyProfile> {
  const sym = symbol.toUpperCase();
  return cachedPage(`company-profile:${sym}`, 6 * 3600, async () => {
    try {
      const s = await yf.quoteSummary(toProviderSymbol(sym), { modules: ["assetProfile", "calendarEvents", "quoteType"] });
      const dates = s.calendarEvents?.earnings?.earningsDate ?? [];
      const next = dates.map((d) => new Date(d)).find((d) => d.getTime() > Date.now() - 86_400_000) ?? null;
      const summary = s.assetProfile?.longBusinessSummary ?? null;
      return {
        industry: s.assetProfile?.industry ?? null,
        description: summary ? firstSentences(summary) : null,
        nextEarnings: next ? next.toISOString().slice(0, 10) : null,
        isEtf: s.quoteType?.quoteType === "ETF",
      };
    } catch {
      return { industry: null, description: null, nextEarnings: null, isEtf: false };
    }
  });
}
