import { NextResponse } from "next/server";
import { runFactCheck } from "@/lib/ai/fact-check";
import { spendAiCredits } from "@/lib/ai/spend";
import { persistClaims } from "@/app/actions/claims";

export async function POST(req: Request) {
  const { text, reportId } = (await req.json()) as { text?: string; reportId?: string };
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

  // Persist to the structured `claims` table for a draft the caller owns, so
  // the debate feature and inline highlighting have offsets to work with.
  // Optional — the caller may not know the report id yet (new, unsaved draft).
  if (reportId) {
    try {
      await persistClaims(reportId, text, result.claims);
    } catch {
      // non-critical — the jsonb summary on the report still gets saved by the editor
    }
  }

  return NextResponse.json({
    ...result,
    credits_remaining: spend.remaining,
  });
}
