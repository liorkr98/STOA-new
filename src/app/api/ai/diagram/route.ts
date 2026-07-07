import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { spendAiCredits } from "@/lib/ai/spend";
import { llmModel, hasLlmApiKey } from "@/lib/ai/llm";
import { normalizePromptInput } from "@/lib/ai/prompt-safety";
import { DIAGRAM_SYSTEM_PROMPT, preparePromptText } from "@/lib/ai/graphify";
import { mergeUsage, TOKEN_BUDGETS } from "@/lib/ai/token-economy";
import { BulletPointsResponseSchema } from "@/lib/diagram/schema";

/**
 * Built-in diagram generation (OpenNapkinAI-style): AI extracts 4 bullet points;
 * the client renders template SVG via RoughJS. No external image API required.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasLlmApiKey()) {
    return NextResponse.json(
      { error: "Set DEEPSEEK_API_KEY on Vercel for built-in diagram generation." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { content?: string };
  const raw = normalizePromptInput(body.content ?? "", 8_000);
  if (!raw.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const prepared = preparePromptText("diagram", raw);
  const spend = await spendAiCredits(
    "diagram",
    `Built-in diagram (${prepared.graphify.tokensAfter} tok)`,
    prepared.quote.totalCredits,
  );
  if (spend.error) {
    return NextResponse.json(
      { error: spend.error, have: spend.have, need: spend.need },
      { status: spend.error === "insufficient_credits" ? 402 : 400 },
    );
  }

  try {
    const { object, usage } = await generateObject({
      model: llmModel(),
      system: DIAGRAM_SYSTEM_PROMPT,
      prompt: prepared.text,
      schema: BulletPointsResponseSchema,
      temperature: 0.4,
      maxOutputTokens: TOKEN_BUDGETS.diagram.maxOutput,
    });

    return NextResponse.json({
      provider: "open",
      bulletPoints: object.bulletPoints,
      credits_remaining: spend.remaining,
      credits_charged: prepared.quote.totalCredits,
      graphify: {
        tokens_before: prepared.graphify.tokensBefore,
        tokens_after: prepared.graphify.tokensAfter,
        tokens_saved: prepared.graphify.tokensSaved,
        excerpts: prepared.graphify.excerptCount,
      },
      usage: mergeUsage(prepared.graphify.tokensAfter, usage),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Diagram generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
