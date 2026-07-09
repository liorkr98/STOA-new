import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface SearchCreator {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  followers_count: number;
  sim?: number;
}

export interface SearchTicker {
  symbol: string;
  company_name: string;
  sector: string | null;
  report_count: number;
  sim?: number;
}

/**
 * Typeahead search across creators and tickers (pg_trgm). Limit ~5 each.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ creators: [], tickers: [] });
  }

  const limitParam = Number(new URL(req.url).searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(limitParam) ? Math.min(20, Math.max(1, limitParam)) : 5;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_platform", {
      p_query: q,
      p_limit: limit,
    });
    if (error) throw error;

    const payload = (data ?? { creators: [], tickers: [] }) as {
      creators: SearchCreator[];
      tickers: SearchTicker[];
    };

    return NextResponse.json({
      creators: (payload.creators ?? []).map((row) => {
        const rest = { ...row };
        delete rest.sim;
        return rest;
      }),
      tickers: (payload.tickers ?? []).map((row) => {
        const rest = { ...row };
        delete rest.sim;
        return rest;
      }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
