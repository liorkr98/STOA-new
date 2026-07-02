import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeOutcome, callReturn, computeScore, computeTier } from "@/lib/engine/score";
import { benchmarkReturn, getQuote } from "@/lib/engine/market";
import type { Outcome } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Admin-only manual resolution for reports stuck in `resolution_pending_review`.
 * Body: { reportId, resolvedPrice, outcome? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = (await request.json()) as {
    reportId?: string;
    resolvedPrice?: number;
    outcome?: Outcome;
  };
  if (!body.reportId || body.resolvedPrice == null || body.resolvedPrice <= 0) {
    return NextResponse.json({ error: "reportId and resolvedPrice required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: prediction } = await admin
    .from("predictions")
    .select("*")
    .eq("report_id", body.reportId)
    .eq("outcome", "open")
    .maybeSingle();

  if (!prediction) {
    return NextResponse.json({ error: "No open prediction for this report" }, { status: 404 });
  }

  const spy = await getQuote("SPY");
  const benchResolved = spy.price;
  const outcome =
    body.outcome ??
    gradeOutcome({
      direction: prediction.direction,
      lock_price: prediction.lock_price,
      target_price: prediction.target_price,
      resolved_price: body.resolvedPrice,
    });
  const returnPct = callReturn(prediction.direction, prediction.lock_price, body.resolvedPrice);
  const benchPct = prediction.bench_lock_price
    ? benchmarkReturn(prediction.bench_lock_price, benchResolved)
    : null;

  await admin
    .from("predictions")
    .update({
      resolved_price: body.resolvedPrice,
      bench_resolved_price: benchResolved,
      benchmark_pct: benchPct,
      return_pct: returnPct,
      outcome,
      resolution_trading_date: new Date().toISOString().slice(0, 10),
    })
    .eq("id", prediction.id);

  await admin.from("reports").update({ status: "published" }).eq("id", body.reportId);

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "report.resolved.manual",
    entity_type: "prediction",
    entity_id: prediction.id,
    metadata: { resolved_price: body.resolvedPrice, outcome, admin_id: user.id },
  });

  const { data: rows } = await admin
    .from("predictions")
    .select("*")
    .eq("author_id", prediction.author_id);
  const result = computeScore(rows ?? []);
  const tier = computeTier(result.score, result.total);
  await admin
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
    })
    .eq("id", prediction.author_id);

  return NextResponse.json({ ok: true, outcome });
}
