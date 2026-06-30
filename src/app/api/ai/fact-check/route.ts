import { NextResponse } from "next/server";
import { runFactCheck } from "@/lib/ai/fact-check";
import { spendAiCredits } from "@/lib/ai/spend";

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "No content to check" }, { status: 400 });
  }

  const spend = await spendAiCredits("factCheck", "Fact-check report");
  if (spend.error) {
    return NextResponse.json(
      { error: spend.error, have: spend.have, need: spend.need },
      { status: spend.error === "insufficient_credits" ? 402 : 400 },
    );
  }

  const result = await runFactCheck(text);
  return NextResponse.json({
    ...result,
    credits_remaining: spend.remaining,
  });
}
