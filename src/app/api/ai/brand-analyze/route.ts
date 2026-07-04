import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { spendAiCredits } from "@/lib/ai/spend";
import type { BrandAnalyzeResult } from "@/lib/profile/brand-analyze";

const inputSchema = z.object({
  display_name: z.string(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  specialties: z.array(z.string()),
  social: z.array(z.object({ label: z.string(), url: z.string() })),
});

function mockAnalyze(input: z.infer<typeof inputSchema>): BrandAnalyzeResult {
  const warnings: string[] = [];
  if (!input.bio?.trim()) warnings.push("Bio is empty — investors won't know your angle.");
  if (!input.headline?.trim()) warnings.push("Add a headline that states your edge.");
  if (input.specialties.length < 2) warnings.push("Add at least two specialties for discoverability.");

  const suggestions: BrandAnalyzeResult["suggestions"] = [];
  if (!input.headline?.trim()) {
    suggestions.push({
      field: "headline",
      proposed: `${input.display_name} on ${input.specialties[0] ?? "equity"} — data-driven calls`,
      reason: "A specific headline helps investors understand your niche instantly.",
    });
  }
  if (!input.bio?.trim()) {
    suggestions.push({
      field: "bio",
      proposed: `Independent analyst covering ${input.specialties.join(", ") || "US equities"}. Every call is scored on a permanent track record.`,
      reason: "Lead with coverage and accountability.",
    });
  }
  if (input.specialties.length < 3) {
    suggestions.push({
      field: "specialties",
      proposed: [...new Set([...input.specialties, "US equities", "Tech"])].slice(0, 4),
      reason: "Broader tags improve search and feed matching.",
    });
  }

  return {
    scores: {
      clarity: input.headline ? 72 : 48,
      credibility: input.bio ? 70 : 45,
      discoverability: Math.min(90, 40 + input.specialties.length * 12),
      cta_strength: input.social.length > 0 ? 65 : 40,
    },
    suggestions,
    warnings,
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = inputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const spend = await spendAiCredits("brandAnalyze", "Brand analyzer");
  if (spend.error) {
    return NextResponse.json(
      { error: spend.error, have: spend.have, need: spend.need },
      { status: spend.error === "insufficient_credits" ? 402 : 400 },
    );
  }

  const input = parsed.data;
  const apiKey = process.env.OPENAI_API_KEY;
  let result: BrandAnalyzeResult;

  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a branding coach for financial analysts on Stoa. Return JSON only:
{ "scores": { "clarity": 0-100, "credibility": 0-100, "discoverability": 0-100, "cta_strength": 0-100 },
  "suggestions": [{ "field": "headline"|"bio"|"specialties"|"social", "proposed": string|string[], "reason": string }],
  "warnings": string[] }
Be direct. No hype. Proposed bio max 280 chars.`,
            },
            { role: "user", content: JSON.stringify(input) },
          ],
        }),
      });
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = json.choices?.[0]?.message?.content;
      if (!raw) throw new Error("empty response");
      result = JSON.parse(raw) as BrandAnalyzeResult;
    } catch {
      result = mockAnalyze(input);
    }
  } else {
    result = mockAnalyze(input);
  }

  return NextResponse.json({ ...result, credits_remaining: spend.remaining });
}
