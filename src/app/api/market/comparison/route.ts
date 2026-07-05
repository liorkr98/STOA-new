import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fmp, MarketDataError, type ComparisonMetric } from "@/lib/market";

const LIMIT = 20;
const WINDOW_SEC = 60;
const METRICS: ComparisonMetric[] = [
  "revenue",
  "netIncome",
  "eps",
  "grossMargin",
  "operatingMargin",
  "netMargin",
  "revenueGrowth",
];

/**
 * FMP metric-over-time comparison proxy for comparisonNode hydration (A6). Auth
 * + rate limit keep the key server-side; readers render the cached result baked
 * into the node at publish.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_rate_key: `market-comparison:${user.id}`,
    p_window_seconds: WINDOW_SEC,
    p_max_requests: LIMIT,
  });
  if (allowed === false) {
    return NextResponse.json({ error: "Rate limit exceeded (20/min)" }, { status: 429 });
  }

  const url = new URL(req.url);
  const symbols = (url.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const metricParam = (url.searchParams.get("metric") ?? "revenue") as ComparisonMetric;
  const years = Math.min(10, Math.max(1, Number(url.searchParams.get("years") ?? 5) || 5));
  if (symbols.length === 0) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }
  const metric = METRICS.includes(metricParam) ? metricParam : "revenue";

  try {
    const comparison = await fmp.getComparison(symbols, metric, years);
    return NextResponse.json(
      { comparison },
      { headers: { "Cache-Control": "private, max-age=86400" } },
    );
  } catch (err) {
    if (err instanceof MarketDataError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
