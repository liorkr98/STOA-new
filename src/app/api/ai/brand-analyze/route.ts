import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { spendAiCredits } from "@/lib/ai/spend";
import { hasLlmApiKey, llmModel } from "@/lib/ai/llm";
import type { BrandAnalyzeResult } from "@/lib/profile/brand-analyze";

const brandResultSchema = z.object({
  scores: z.object({
    clarity: z.number(),
    credibility: z.number(),
    discoverability: z.number(),
    cta_strength: z.number(),
  }),
  suggestions: z.array(
    z.object({
      field: z.enum(["headline", "bio", "specialties", "social"]),
      proposed: z.union([z.string(), z.array(z.string())]),
      reason: z.string(),
    }),
  ),
  warnings: z.array(z.string()),
});

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
  if (input.social.length === 0) {
    suggestions.push({
      field: "social",
      proposed: ["https://x.com/yourhandle", "https://linkedin.com/in/you"],
      reason: "Add one or two proof-of-work links investors can verify.",
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
  let result: BrandAnalyzeResult;

  if (hasLlmApiKey()) {
    try {
      const { object } = await generateObject({
        model: llmModel(),
        schema: brandResultSchema,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are a branding coach for financial analysts on Stoa. Be direct. No hype. Proposed bio max 280 chars.",
          },
          { role: "user", content: JSON.stringify(input) },
        ],
      });
      result = object as BrandAnalyzeResult;
    } catch {
      result = mockAnalyze(input);
    }
  } else {
    result = mockAnalyze(input);
  }

  return NextResponse.json({ ...result, credits_remaining: spend.remaining });
}
