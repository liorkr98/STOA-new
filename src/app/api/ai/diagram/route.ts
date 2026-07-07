import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { spendAiCredits } from "@/lib/ai/spend";
import { openaiModel } from "@/lib/ai/openai";
import { normalizePromptInput } from "@/lib/ai/prompt-safety";
import { DIAGRAM_SYSTEM_PROMPT } from "@/lib/diagram/prompt";
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

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Set OPENAI_API_KEY on Vercel for built-in diagram generation." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { content?: string };
  const content = normalizePromptInput(body.content ?? "", 4_000);
  if (!content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const spend = await spendAiCredits("diagram", "Built-in diagram");
  if (spend.error) {
    return NextResponse.json(
      { error: spend.error, have: spend.have, need: spend.need },
      { status: spend.error === "insufficient_credits" ? 402 : 400 },
    );
  }

  try {
    const { object } = await generateObject({
      model: openaiModel(),
      system: DIAGRAM_SYSTEM_PROMPT,
      prompt: content,
      schema: BulletPointsResponseSchema,
      temperature: 0.5,
    });

    return NextResponse.json({
      provider: "open",
      bulletPoints: object.bulletPoints,
      credits_remaining: spend.remaining,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Diagram generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
