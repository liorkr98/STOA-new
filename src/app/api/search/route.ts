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

export interface SearchReportHit {
  id: string;
  title: string;
  ticker: string | null;
  author_handle: string | null;
}

function rankTickers(rows: SearchTicker[], q: string): SearchTicker[] {
  const upper = q.toUpperCase();
  const lower = q.toLowerCase();
  return [...rows]
    .map((t) => {
      let boost = t.sim ?? 0;
      if (t.symbol === upper) boost += 100;
      else if (t.symbol.startsWith(upper)) boost += 60;
      else if (t.symbol.includes(upper)) boost += 30;
      if (t.company_name.toLowerCase().startsWith(lower)) boost += 20;
      else if (t.company_name.toLowerCase().includes(lower)) boost += 10;
      boost += Math.min(t.report_count, 15);
      return { t, boost };
    })
    .sort((a, b) => b.boost - a.boost)
    .map((x) => x.t);
}

function rankCreators(rows: SearchCreator[], q: string): SearchCreator[] {
  const lower = q.toLowerCase();
  return [...rows]
    .map((c) => {
      let boost = c.sim ?? 0;
      if (c.handle.toLowerCase() === lower) boost += 100;
      else if (c.handle.toLowerCase().startsWith(lower)) boost += 50;
      if (c.display_name.toLowerCase().startsWith(lower)) boost += 40;
      else if (c.display_name.toLowerCase().includes(lower)) boost += 15;
      boost += Math.min(Math.floor((c.score ?? 0) / 10), 20);
      return { c, boost };
    })
    .sort((a, b) => b.boost - a.boost)
    .map((x) => x.c);
}

async function fallbackSearch(
  q: string,
  limit: number,
): Promise<{ creators: SearchCreator[]; tickers: SearchTicker[]; reports: SearchReportHit[] }> {
  const supabase = await createClient();
  const safe = q.replace(/[%_,]/g, "").slice(0, 64);
  if (!safe) return { creators: [], tickers: [], reports: [] };
  const like = `%${safe}%`;
  const upper = safe.toUpperCase();

  const [{ data: creators }, { data: tickers }, { data: reports }] = await Promise.all([
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
    supabase
      .from("reports")
      .select("id, title, ticker, author:profiles!reports_author_id_fkey(handle)")
      .in("status", ["published", "resolution_pending_review"])
      .or(`title.ilike.${like},ticker.ilike.%${upper}%`)
      .order("published_at", { ascending: false })
      .limit(limit),
  ]);

  return {
    creators: rankCreators((creators as SearchCreator[] | null) ?? [], safe),
    tickers: rankTickers(
      ((tickers as { symbol: string; name: string; sector: string | null }[] | null) ?? []).map(
        (t) => ({
          symbol: t.symbol,
          company_name: t.name,
          sector: t.sector,
          report_count: 0,
        }),
      ),
      safe,
    ),
    reports: ((reports as Record<string, unknown>[] | null) ?? []).map((r) => {
      const author = r.author as { handle?: string } | { handle?: string }[] | null;
      const handle = Array.isArray(author) ? author[0]?.handle : author?.handle;
      return {
        id: String(r.id),
        title: String(r.title ?? ""),
        ticker: (r.ticker as string | null) ?? null,
        author_handle: handle ?? null,
      };
    }),
  };
}

async function searchReports(q: string, limit: number): Promise<SearchReportHit[]> {
  const supabase = await createClient();
  const safe = q.replace(/[%_,]/g, "").slice(0, 64);
  if (!safe) return [];
  const like = `%${safe}%`;
  const upper = safe.toUpperCase();
  const { data } = await supabase
    .from("reports")
    .select("id, title, ticker, author:profiles!reports_author_id_fkey(handle)")
    .in("status", ["published", "resolution_pending_review"])
    .or(`title.ilike.${like},ticker.ilike.%${upper}%`)
    .order("published_at", { ascending: false })
    .limit(limit);

  return ((data as Record<string, unknown>[] | null) ?? []).map((r) => {
    const author = r.author as { handle?: string } | { handle?: string }[] | null;
    const handle = Array.isArray(author) ? author[0]?.handle : author?.handle;
    return {
      id: String(r.id),
      title: String(r.title ?? ""),
      ticker: (r.ticker as string | null) ?? null,
      author_handle: handle ?? null,
    };
  });
}

/**
 * Typeahead search across tickers, analysts, and reports.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ creators: [], tickers: [], reports: [] });
  }

  const limitParam = Number(new URL(req.url).searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(limitParam) ? Math.min(12, Math.max(1, limitParam)) : 5;

  try {
    const supabase = await createClient();
    const [{ data, error }, reports] = await Promise.all([
      supabase.rpc("search_platform", { p_query: q, p_limit: limit }),
      searchReports(q, Math.min(4, limit)),
    ]);
    if (error) throw error;

    const payload = (data ?? { creators: [], tickers: [] }) as {
      creators: SearchCreator[];
      tickers: SearchTicker[];
    };

    return NextResponse.json({
      creators: rankCreators(payload.creators ?? [], q).slice(0, limit),
      tickers: rankTickers(payload.tickers ?? [], q).slice(0, limit),
      reports,
    });
  } catch {
    try {
      const fallback = await fallbackSearch(q, limit);
      return NextResponse.json(fallback);
    } catch (e) {
      const message = e instanceof Error ? e.message : "search failed";
      return NextResponse.json(
        { error: message, creators: [], tickers: [], reports: [] },
        { status: 500 },
      );
    }
  }
}
