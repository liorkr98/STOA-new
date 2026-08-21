import type { SupabaseClient } from "@supabase/supabase-js";
import type { Prediction } from "@/lib/types";
import { FORMULA_VERSION, computeScore, computeTier, type ScoreResult } from "./score";

export interface RecomputeItem {
  authorId: string;
  previousScore: number | null;
  result: ScoreResult;
}

export interface RecomputeSummary {
  formulaVersion: string;
  analysts: number;
  committed: boolean;
  /** How many analysts' scores would change (or did change, if committed). */
  changed: number;
  items: RecomputeItem[];
}

/**
 * Recompute EVERY analyst's Track Score from stored call history under the
 * current formula, and (optionally) rewrite it.
 *
 * Dry-run by default: it computes and reports what would change but writes
 * nothing. Pass { commit: true } to rewrite each `profiles` row and insert a
 * fresh `moat_score_snapshots` row.
 *
 * The rule this enforces: all scores are recomputed together against ONE shared
 * alpha distribution, so no two analysts are ever scored under different inputs.
 * The distribution is built from every analyst's freshly computed avg_alpha
 * (canonical), rather than the incremental approximation grade.ts uses per pass.
 *
 * Note: the formula time-weights calls by wall-clock (recent calls count more),
 * so recomputing "now" refreshes those decayed weights. That is the current
 * formula behaving as designed, not a formula change.
 */
export async function recomputeAllScores(
  db: SupabaseClient,
  opts: { commit?: boolean } = {},
): Promise<RecomputeSummary> {
  const commit = opts.commit ?? false;

  // Every analyst that has at least one call.
  const { data: authorRows, error: authorErr } = await db
    .from("predictions")
    .select("author_id")
    .limit(100000);
  if (authorErr) throw new Error(authorErr.message);
  const authorIds = [...new Set((authorRows ?? []).map((r) => r.author_id as string))];

  // Fetch each analyst's calls once; reuse across both passes.
  const callsByAuthor = new Map<string, Prediction[]>();
  for (const authorId of authorIds) {
    const { data: rows, error } = await db
      .from("predictions")
      .select("*, report:reports!predictions_report_id_fkey(status)")
      .eq("author_id", authorId)
      .limit(1000);
    if (error) throw new Error(error.message);
    // Score from the same set the public track record displays: calls whose
    // parent report is published. listResolvedCallsWithReports already filters
    // this way, so without it a recomputed score counts calls the record does
    // not show, and an archived report would still move the number.
    type RowWithReport = Prediction & { report: { status: string } | null };
    const published = ((rows as RowWithReport[]) ?? []).filter(
      (p) => p.report?.status === "published",
    );
    callsByAuthor.set(authorId, published);
  }

  // Pass 1: the shared, canonical alpha distribution from fresh avg_alpha.
  const globalAlphaDistribution: number[] = [];
  for (const authorId of authorIds) {
    const prelim = computeScore(callsByAuthor.get(authorId) ?? []);
    if (prelim.avgAlpha != null) globalAlphaDistribution.push(prelim.avgAlpha);
  }

  // Pass 2: final score per analyst against that one distribution.
  const items: RecomputeItem[] = [];
  let changed = 0;
  for (const authorId of authorIds) {
    const result = computeScore(callsByAuthor.get(authorId) ?? [], globalAlphaDistribution);

    const { data: prof } = await db.from("profiles").select("score").eq("id", authorId).maybeSingle();
    const previousScore = (prof?.score as number | null) ?? null;
    if (previousScore !== result.score) changed++;

    if (commit) {
      const tier = computeTier(result.score, result.total);
      await db
        .from("profiles")
        .update({
          score: result.score,
          rating: result.rating,
          tier: tier.key,
          wilson_win_rate: result.wilsonWinRate,
          profit_factor: result.profitFactor,
          avg_return: result.avgReturn,
          avg_alpha: result.avgAlpha,
          sample_size: result.total,
          // TODO(schema): once `profiles.formula_version` exists, set it to
          // result.formulaVersion here. See docs/PRODUCT_MODEL.md.
        })
        .eq("id", authorId);

      await db.from("moat_score_snapshots").insert({
        creator_id: authorId,
        score: result.score,
        sample_size: result.total,
        wilson_win_rate: result.wilsonWinRate,
        profit_factor: result.profitFactor,
        avg_return: result.avgReturn,
        avg_alpha: result.avgAlpha,
        breakdown: result.breakdown,
        // TODO(schema): once `moat_score_snapshots.formula_version` exists, set
        // it to result.formulaVersion here. See docs/PRODUCT_MODEL.md.
      });
    }

    items.push({ authorId, previousScore, result });
  }

  return {
    formulaVersion: FORMULA_VERSION,
    analysts: authorIds.length,
    committed: commit,
    changed,
    items,
  };
}
