import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueOrRun } from "@/lib/jobs/client";
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
import { alertReportPublished } from "@/lib/slack/alerts";
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
  // The only real eligibility gate in this stack: an admin approved this
  // account as an analyst (approve_analyst_application sets profiles.role).
  // Previously enforced only by the studio compose page's client-side
  // redirect (src/app/studio/layout.tsx) -- calling this action or the
  // /api/reports/[id]/publish route directly bypassed it entirely, since
  // neither RLS (reports_insert/update only check author_id) nor this
  // function checked role at all. A rejected or never-applied account could
  // publish exactly like an approved one.
  const { data: publisher } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (publisher?.role !== "analyst" && publisher?.role !== "admin") {
    throw new PublishReportError(
      "Only approved analysts can publish. Apply to become an analyst first.",
      403,
    );
  }

  const disclosureProvided = input.views_certified !== undefined;
  if (disclosureProvided && !input.views_certified) {
    throw new PublishReportError("You must certify these are your own views before publishing.");
  }

  const reportId = await saveDraftBody(supabase, userId, input);

  const [{ count: priorPublishCount }, { data: authorProfile }] = await Promise.all([
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .in("status", ["published", "resolution_pending_review"]),
    supabase.from("profiles").select("display_name, handle").eq("id", userId).maybeSingle(),
  ]);

  const chartStats = analyzeChartBody(input.body);
  const urlError = validateChartScreenshotUrls(chartStats.screenshotUrls, userId, reportId);
  if (urlError) throw new PublishReportError(urlError);

  const lockedAtIso = new Date().toISOString();
  const publishPayload: Record<string, unknown> = {
    status: "published",
    published_at: lockedAtIso,
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
  let hashTargetPrice: number | null = null;
  let hashHorizonDate: string | null = null;

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

    hashTargetPrice = input.target_price ?? null;
    hashHorizonDate = targetHorizonDate;
  }

  // Structured-data content hash (docs: institutional SEO infra). Covers every
  // field a reader could dispute was changed after the fact -- ticker, the
  // locked call terms, the body, and the lock timestamp itself. Best-effort:
  // a failure here must never roll back or block an already-published report,
  // and a missing hash is simply omitted from ReportSchema rather than faked.
  try {
    const contentHash = createHash("sha256")
      .update(
        [
          input.ticker ? input.ticker.toUpperCase() : "",
          hashTargetPrice != null ? String(hashTargetPrice) : "",
          hashHorizonDate ?? "",
          input.body ?? "",
          lockedAtIso,
        ].join("|"),
      )
      .digest("hex");
    await supabase
      .from("reports")
      .update({ content_hash: contentHash })
      .eq("id", reportId)
      .eq("author_id", userId);
  } catch {
    // non-critical -- ReportSchema omits identifier when content_hash is null
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
    // Fan-out to followers/subscribers via the queue (retries + dead-letter);
    // runs inline when QStash is not configured.
    await enqueueOrRun("notify", { reportId }, async () => {
      await supabase.rpc("notify_publication", { p_report_id: reportId });
    });
  } catch {
    // non-critical
  }

  if (authorProfile) {
    try {
      await alertReportPublished({
        reportId,
        title: input.title ?? "Untitled",
        type: input.type,
        ticker: input.ticker ? input.ticker.toUpperCase() : null,
        analystName: authorProfile.display_name,
        analystHandle: authorProfile.handle,
        isFirstPublish: (priorPublishCount ?? 0) === 0,
      });
    } catch {
      // non-critical
    }
  }

  return { id: reportId };
}
