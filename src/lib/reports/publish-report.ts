import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBenchmarkQuote, getQuote } from "@/lib/engine/market";
import { getTickerMeta } from "@/lib/engine/tickers";
import {
  effectiveResolutionDate,
  horizonDateFromDays,
  marketCloseIso,
  todayInTimezone,
} from "@/lib/engine/trading-calendar";
import {
  analyzeChartBody,
  validateChartScreenshotUrls,
} from "@/lib/reports/chart-screenshots";
import type { ComposeInput } from "@/lib/types";

export class PublishReportError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

async function saveDraftBody(
  supabase: SupabaseClient,
  userId: string,
  input: ComposeInput,
): Promise<string> {
  const payload = {
    author_id: userId,
    type: input.type,
    title: input.title ?? null,
    summary: input.summary ?? null,
    access: input.access,
    price: input.access === "paid" ? (input.price ?? null) : null,
    min_plan_rank:
      input.access === "subscribers" ? Math.max(0, input.min_plan_rank ?? 0) : 0,
    required_perks: input.access === "subscribers" ? (input.required_perks ?? []) : [],
    ticker: input.ticker ? input.ticker.toUpperCase() : null,
    status: "draft" as const,
  };

  let reportId = input.id;
  if (reportId) {
    const { error } = await supabase
      .from("reports")
      .update(payload)
      .eq("id", reportId)
      .eq("author_id", userId);
    if (error) throw new PublishReportError(error.message, 400);
  } else {
    const { data, error } = await supabase.from("reports").insert(payload).select("id").single();
    if (error) throw new PublishReportError(error.message, 400);
    reportId = (data as { id: string }).id;
  }

  await supabase
    .from("report_bodies")
    .upsert({ report_id: reportId, body: input.body ?? null }, { onConflict: "report_id" });

  return reportId;
}

export async function validateAndPublishReport(
  supabase: SupabaseClient,
  userId: string,
  input: ComposeInput,
): Promise<{ id: string }> {
  const disclosureProvided = input.views_certified !== undefined;
  if (disclosureProvided && !input.views_certified) {
    throw new PublishReportError("You must certify these are your own views before publishing.");
  }

  const reportId = await saveDraftBody(supabase, userId, input);

  const chartStats = analyzeChartBody(input.body);
  const urlError = validateChartScreenshotUrls(chartStats.screenshotUrls, userId, reportId);
  if (urlError) throw new PublishReportError(urlError);

  const publishPayload: Record<string, unknown> = {
    status: "published",
    published_at: new Date().toISOString(),
  };
  if (input.fact_check_results) {
    publishPayload.fact_check_results = input.fact_check_results;
  }
  if (disclosureProvided) {
    publishPayload.position_disclosed = true;
    publishPayload.position_held = input.position_held ?? false;
    publishPayload.compensation_disclosed = true;
    publishPayload.compensation_tied = input.compensation_tied ?? false;
    publishPayload.compensation_detail = input.compensation_detail?.slice(0, 500) ?? null;
    publishPayload.views_certified = input.views_certified;
  }

  const { error: pubErr } = await supabase
    .from("reports")
    .update(publishPayload)
    .eq("id", reportId)
    .eq("author_id", userId);
  if (pubErr) throw new PublishReportError(pubErr.message, 400);

  const wantsPrediction = input.type !== "short_post" && input.ticker && input.direction;

  if (wantsPrediction) {
    const ticker = input.ticker!.toUpperCase();
    const meta = await getTickerMeta(ticker);
    const horizon = input.horizon_days ?? 30;
    const targetHorizonDate =
      input.target_horizon_date ?? horizonDateFromDays(horizon, meta.timezone);

    if (targetHorizonDate <= todayInTimezone(meta.timezone)) {
      throw new PublishReportError(
        `Target horizon date must be after today. "${targetHorizonDate}" is not a valid horizon date for ${ticker}.`,
      );
    }

    const { tradingDate } = effectiveResolutionDate(targetHorizonDate, meta.timezone);
    const [quote, bench] = await Promise.all([getQuote(ticker), getBenchmarkQuote()]);
    if (!quote.available || quote.price == null) {
      throw new PublishReportError(
        `Live price for ${ticker} is unavailable. Try again during market hours or check the symbol.`,
      );
    }
    if (!bench.available || bench.price == null) {
      throw new PublishReportError("Benchmark quote (SPY) is unavailable. Try again shortly.");
    }

    const resolvesAt = marketCloseIso(tradingDate, meta.timezone);

    await supabase.from("predictions").insert({
      report_id: reportId,
      author_id: userId,
      ticker,
      direction: input.direction,
      lock_price: quote.price,
      target_price: input.target_price ?? null,
      horizon_days: horizon,
      target_horizon_date: targetHorizonDate,
      resolution_trading_date: tradingDate,
      resolves_at: resolvesAt,
      bench_lock_price: bench.price,
      outcome: "open",
    });
  }

  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: userId,
      action: "report.published",
      entity_type: "report",
      entity_id: reportId,
      metadata: {
        chart_count: chartStats.chartCount,
        has_screenshots: chartStats.hasScreenshots,
        ticker: input.ticker ? input.ticker.toUpperCase() : null,
        target_price: input.target_price ?? null,
        locked_at: new Date().toISOString(),
      },
    });
  } catch {
    // non-critical — trigger still writes report.locked
  }

  try {
    await supabase.rpc("notify_publication", { p_report_id: reportId });
  } catch {
    // non-critical
  }

  return { id: reportId };
}
