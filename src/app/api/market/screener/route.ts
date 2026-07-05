import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finnhub } from "@/lib/market";
import { UNIVERSE } from "@/lib/universe";

const LIMIT = 10;
const WINDOW_SEC = 60;

export interface ScreenerRow {
  ticker: string;
  name: string;
  sector: string;
  pe: number | null;
  psTtm: number | null;
  revenueGrowth: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  beta: number | null;
  high52: number | null;
  low52: number | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Screener over the covered universe (Part G). One Finnhub metrics pull per
 * ticker, cached a day at the market layer, so the whole sweep is cheap after
 * the first hit. Filtering happens client-side on the returned rows.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_rate_key: `market-screener:${user.id}`,
    p_window_seconds: WINDOW_SEC,
    p_max_requests: LIMIT,
  });
  if (allowed === false) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const rows: ScreenerRow[] = await Promise.all(
    UNIVERSE.map(async (u) => {
      let m: Record<string, number | string | null> = {};
      try {
        m = await finnhub.getBasicFinancials(u.ticker);
      } catch {
        m = {};
      }
      return {
        ticker: u.ticker,
        name: u.name,
        sector: u.sector,
        pe: num(m["peTTM"] ?? m["peBasicExclExtraTTM"]),
        psTtm: num(m["psTTM"]),
        revenueGrowth: num(m["revenueGrowthTTMYoy"]),
        grossMargin: num(m["grossMarginTTM"]),
        netMargin: num(m["netProfitMarginTTM"]),
        beta: num(m["beta"]),
        high52: num(m["52WeekHigh"]),
        low52: num(m["52WeekLow"]),
      };
    }),
  );

  return NextResponse.json({ rows }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
