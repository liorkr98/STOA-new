import { getQuote } from "@/lib/engine/market";

export type ClaimType = "Fact" | "Opinion" | "Misleading" | "Unverified" | "Yahoo-Verified" | "Yahoo-Disputed";

export interface FactClaim {
  text: string;
  type: ClaimType;
  note?: string;
  confidence?: "high" | "medium" | "low";
  verifiableTicker?: string | null;
  verifiableMetric?: string | null;
  yahooCheck?: { match: boolean; detail: string } | null;
}

export interface FactCheckResult {
  claims: FactClaim[];
  checked_at: string;
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in AI response");
  return JSON.parse(match[0]);
}

async function classifyClaims(reportText: string): Promise<FactClaim[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return mockClaims(reportText);
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are a financial fact-checker. Return ONLY valid JSON.`,
        },
        {
          role: "user",
          content: `Identify 5-8 important claims from this research. Classify each as Fact, Opinion, Misleading, or Unverified.
For numeric claims include verifiableTicker and verifiableMetric (price|revenue|marketCap|eps|peRatio).

{"claims":[{"text":"...","type":"Fact|Opinion|Misleading|Unverified","note":"...","confidence":"high|medium|low","verifiableTicker":"NVDA or null","verifiableMetric":"price or null"}]}

Report:
"""${reportText.slice(0, 4000)}"""`,
        },
      ],
    }),
  });

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(raw) as { claims?: FactClaim[] };
  return parsed.claims ?? [];
}

async function verifyWithYahoo(claims: FactClaim[]): Promise<FactClaim[]> {
  const out: FactClaim[] = [];
  const cache = new Map<string, Awaited<ReturnType<typeof getQuote>>>();

  for (const claim of claims) {
    let next = { ...claim };
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

function mockClaims(text: string): FactClaim[] {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 40);
  return sentences.slice(0, 5).map((s, i) => ({
    text: s.slice(0, 200),
    type: i % 3 === 0 ? "Opinion" : "Unverified",
    note: "Add OPENAI_API_KEY for full AI classification.",
    confidence: "medium",
  }));
}

export async function runFactCheck(reportText: string): Promise<FactCheckResult> {
  const classified = await classifyClaims(reportText);
  const verified = await verifyWithYahoo(classified);
  return { claims: verified, checked_at: new Date().toISOString() };
}
