import { createClient } from "@/lib/supabase/server";
import type { AiAction } from "@/lib/ai/credits";
import { AI_COST } from "@/lib/ai/credits";

export interface SpendCreditsResult {
  ok?: boolean;
  error?: string;
  have?: number;
  need?: number;
  remaining?: number;
}

export async function spendAiCredits(
  action: AiAction,
  memo?: string,
  creditOverride?: number,
): Promise<SpendCreditsResult> {
  const credits = creditOverride ?? AI_COST[action];
  if (credits === 0) return { ok: true, remaining: undefined };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("spend_ai_credits", {
    p_credits: credits,
    p_memo: memo ?? `AI: ${action}`,
  });

  if (error) return { error: error.message };
  const result = data as SpendCreditsResult;
  if (result.error) return result;
  return { ok: true, remaining: result.remaining };
}
