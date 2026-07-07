import { NextResponse } from "next/server";
import { runFactCheck } from "@/lib/ai/fact-check";
import { spendAiCredits } from "@/lib/ai/spend";
import { persistClaims } from "@/app/actions/claims";
import { createClient } from "@/lib/supabase/server";
import { normalizePromptInput } from "@/lib/ai/prompt-safety";
import { quoteFactCheckInput } from "@/lib/fact-check/claim-extraction";

const FACT_CHECK_LIMIT = 20;
const FACT_CHECK_WINDOW_SEC = 3600;

export async function POST(req: Request) {
  const { text, reportId } = (await req.json()) as { text?: string; reportId?: string };
  const normalizedText = text ? normalizePromptInput(text, 24_000) : "";
  if (!normalizedText) {
    return NextResponse.json({ error: "No content to check" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_rate_key: `fact-check:${user.id}`,
    p_window_seconds: FACT_CHECK_WINDOW_SEC,
    p_max_requests: FACT_CHECK_LIMIT,
  });
  if (allowed === false) {
    return NextResponse.json(
      { error: `Fact-check limit reached (${FACT_CHECK_LIMIT}/hour). Try again later.` },
      { status: 429 },
    );
  }

  const prepared = quoteFactCheckInput(normalizedText);
  const spend = await spendAiCredits(
    "factCheck",
    `Fact-check (${prepared.graphify.tokensAfter} tok)`,
    prepared.quote.totalCredits,
  );
  if (spend.error) {
    return NextResponse.json(
      { error: spend.error, have: spend.have, need: spend.need },
      { status: spend.error === "insufficient_credits" ? 402 : 400 },
    );
  }

  const result = await runFactCheck(normalizedText);

  // Persist to the structured `claims` table for a draft the caller owns, so
  // the debate feature and inline highlighting have offsets to work with.
  // Optional — the caller may not know the report id yet (new, unsaved draft).
  if (reportId) {
    try {
      await persistClaims(reportId, normalizedText, result.claims);
    } catch {
      // non-critical — the jsonb summary on the report still gets saved by the editor
    }
  }

  return NextResponse.json({
    ...result,
    credits_remaining: spend.remaining,
    credits_charged: prepared.quote.totalCredits,
    graphify: {
      tokens_before: prepared.graphify.tokensBefore,
      tokens_after: prepared.graphify.tokensAfter,
      tokens_saved: prepared.graphify.tokensSaved,
    },
  });
}
