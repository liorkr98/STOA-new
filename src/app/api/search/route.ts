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

async function fallbackSearch(
  q: string,
  limit: number,
): Promise<{ creators: SearchCreator[]; tickers: SearchTicker[] }> {
  const supabase = await createClient();
  const safe = q.replace(/[%_,]/g, "").slice(0, 64);
  if (!safe) return { creators: [], tickers: [] };
  const like = `%${safe}%`;

  const [{ data: creators }, { data: tickers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url, score, followers_count")
      .in("role", ["analyst", "admin"])
      .or(`handle.ilike.${like},display_name.ilike.${like}`)
      .order("score", { ascending: false })
      .limit(limit),
    supabase
      .from("tickers")
      .select("symbol, name, sector")
      .eq("status", "active")
      .or(`symbol.ilike.${like},name.ilike.${like}`)
      .limit(limit),
  ]);

  return {
    creators: (creators as SearchCreator[] | null) ?? [],
    tickers: ((tickers as { symbol: string; name: string; sector: string | null }[] | null) ?? []).map(
      (t) => ({
        symbol: t.symbol,
        company_name: t.name,
        sector: t.sector,
        report_count: 0,
      }),
    ),
  };
}

/**
 * Typeahead search across creators and tickers (pg_trgm RPC, with ILIKE fallback).
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
  } catch {
    try {
      const fallback = await fallbackSearch(q, limit);
      return NextResponse.json(fallback);
    } catch (e) {
      const message = e instanceof Error ? e.message : "search failed";
      return NextResponse.json({ error: message, creators: [], tickers: [] }, { status: 500 });
    }
  }
}
