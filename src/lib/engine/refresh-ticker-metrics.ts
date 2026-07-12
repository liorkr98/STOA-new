import YahooFinance from "yahoo-finance2";
import type { SupabaseClient } from "@supabase/supabase-js";
import { capBandFromMarketCap } from "@/lib/market/cap-bands";
import { toYahoo } from "@/lib/market/symbols";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 300 },
});

const BATCH_SIZE = 80;

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type RefreshResult = {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  finished: boolean;
  metricsUpdatedAt: string;
};

/**
 * Refreshes cached last_price / market_cap for active tickers in symbol order.
 * Processes up to `maxBatches` Yahoo batches per invocation (for cron time limits).
 */
export async function refreshTickerMetrics(
  db: SupabaseClient,
  options: { maxBatches?: number; offset?: number } = {},
): Promise<RefreshResult & { nextOffset: number }> {
  const maxBatches = options.maxBatches ?? 120;
  const offset = options.offset ?? 0;
  const now = new Date().toISOString();

  const { data: symbols, error } = await db
    .from("tickers")
    .select("symbol")
    .eq("status", "active")
    .order("symbol", { ascending: true });

  if (error) throw new Error(error.message);
  const all = (symbols ?? []).map((r) => String(r.symbol));
  const slice = all.slice(offset);
  if (slice.length === 0) {
    return {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      finished: true,
      metricsUpdatedAt: now,
      nextOffset: 0,
    };
  }

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let batches = 0;
  let cursor = 0;

  while (cursor < slice.length && batches < maxBatches) {
    const batch = slice.slice(cursor, cursor + BATCH_SIZE);
    cursor += batch.length;
    batches += 1;

    const yahooSymbols = batch.map((s) => toYahoo(s));
    let results: unknown[] = [];
    try {
      const raw = await yahooFinance.quote(yahooSymbols);
      results = Array.isArray(raw) ? raw : [raw];
    } catch {
      errors += batch.length;
      processed += batch.length;
      continue;
    }

    const byYahoo = new Map<string, Record<string, unknown>>();
    for (const r of results) {
      if (!r || typeof r !== "object") continue;
      const row = r as Record<string, unknown>;
      const sym = String(row.symbol ?? "").toUpperCase();
      if (sym) byYahoo.set(sym, row);
    }

    for (const canonical of batch) {
      processed += 1;
      const row = byYahoo.get(toYahoo(canonical)) ?? byYahoo.get(canonical.toUpperCase());
      if (!row) {
        skipped += 1;
        continue;
      }
      const price = num(row.regularMarketPrice);
      const marketCap = num(row.marketCap);
      if (price == null && marketCap == null) {
        skipped += 1;
        continue;
      }

      const capBand = capBandFromMarketCap(marketCap);
      const { error: upErr } = await db
        .from("tickers")
        .update({
          last_price: price,
          market_cap: marketCap != null ? Math.round(marketCap) : null,
          cap_band: capBand,
          metrics_updated_at: now,
          updated_at: now,
        })
        .eq("symbol", canonical);

      if (upErr) errors += 1;
      else updated += 1;
    }
  }

  const nextOffset = offset + cursor;
  return {
    processed,
    updated,
    skipped,
    errors,
    finished: nextOffset >= all.length,
    metricsUpdatedAt: now,
    nextOffset: nextOffset >= all.length ? 0 : nextOffset,
  };
}
