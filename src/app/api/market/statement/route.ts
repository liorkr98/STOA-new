import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { edgar, MarketDataError, type StatementKind } from "@/lib/market";

const LIMIT = 30;
const WINDOW_SEC = 60;
const KINDS: StatementKind[] = ["income", "balance", "cashflow"];

/**
 * EDGAR financial-statement proxy for statementNode hydration (A4). Auth + rate
 * limit keep the provider server-side and are a good SEC citizen. Public filing
 * data, but composed only in the editor; readers render the cached statement
 * baked into the node at publish.
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
    p_rate_key: `market-statement:${user.id}`,
    p_window_seconds: WINDOW_SEC,
    p_max_requests: LIMIT,
  });
  if (allowed === false) {
    return NextResponse.json({ error: "Rate limit exceeded (30/min)" }, { status: 429 });
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  const kindParam = (url.searchParams.get("kind") ?? "income").toLowerCase();
  const years = Math.min(10, Math.max(1, Number(url.searchParams.get("years") ?? 5) || 5));
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const kind = (KINDS as string[]).includes(kindParam) ? (kindParam as StatementKind) : "income";

  try {
    const statement = await edgar.getStatement(symbol, kind, years);
    return NextResponse.json(
      { statement },
      { headers: { "Cache-Control": "private, max-age=86400" } },
    );
  } catch (err) {
    if (err instanceof MarketDataError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
