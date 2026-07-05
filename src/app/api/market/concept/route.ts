import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { edgar, MarketDataError } from "@/lib/market";

const LIMIT = 30;
const WINDOW_SEC = 60;

/**
 * EDGAR company-concept lookup for the dataFigureNode "find in filings" picker
 * (A10). Returns the recent reported values for one XBRL concept so an analyst
 * can drop a cited figure. Auth + rate limited; server-side key discipline.
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
    p_rate_key: `market-concept:${user.id}`,
    p_window_seconds: WINDOW_SEC,
    p_max_requests: LIMIT,
  });
  if (allowed === false) {
    return NextResponse.json({ error: "Rate limit exceeded (30/min)" }, { status: 429 });
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  const concept = url.searchParams.get("concept");
  if (!symbol || !concept) {
    return NextResponse.json({ error: "symbol and concept required" }, { status: 400 });
  }

  try {
    const figures = await edgar.getCompanyConcept(symbol, concept);
    // Most recent first, capped -- the picker only needs a short recent list.
    const recent = [...figures].reverse().slice(0, 16);
    return NextResponse.json(
      { symbol, concept, figures: recent },
      { headers: { "Cache-Control": "private, max-age=86400" } },
    );
  } catch (err) {
    if (err instanceof MarketDataError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
