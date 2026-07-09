import { createClient } from "@/lib/supabase/server";
import type { Profile, Report } from "@/lib/types";

const REPORT_SELECT =
  "*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*)";

function normalizeReport(row: Record<string, unknown>): Report {
  const raw = Array.isArray(row.prediction) ? (row.prediction[0] ?? null) : (row.prediction ?? null);
  return { ...(row as unknown as Report), prediction: raw };
}

export interface SearchResults {
  analysts: Profile[];
  reports: Report[];
  tickers: { ticker: string; name: string; sector: string }[];
}

function reportRelevance(report: Report, q: string, upper: string): number {
  const ticker = (report.ticker ?? report.prediction?.ticker ?? "").toUpperCase();
  const title = (report.title ?? "").toLowerCase();
  const summary = (report.summary ?? "").toLowerCase();
  const needle = q.toLowerCase();
  let score = 0;
  if (ticker === upper) score += 100;
  else if (ticker.startsWith(upper)) score += 80;
  else if (ticker.includes(upper)) score += 40;
  if (title.startsWith(needle)) score += 50;
  else if (title.includes(needle)) score += 30;
  if (summary.includes(needle)) score += 20;
  score += Math.min(Math.floor((report.views ?? 0) / 100), 20);
  return score;
}

export async function searchAll(query: string, limit = 12): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { analysts: [], reports: [], tickers: [] };

  const supabase = await createClient();
  const upper = q.toUpperCase();
  const fetchLimit = Math.min(60, Math.max(limit * 3, 24));

  const [{ data: platform }, { data: reports }] = await Promise.all([
    supabase.rpc("search_platform", { p_query: q, p_limit: limit }),
    supabase
      .from("reports")
      .select(REPORT_SELECT)
      .eq("status", "published")
      .or(`title.ilike.%${q}%,summary.ilike.%${q}%,ticker.ilike.%${upper}%`)
      .order("published_at", { ascending: false })
      .limit(fetchLimit),
  ]);

  const payload = (platform ?? { creators: [], tickers: [] }) as {
    creators: Profile[];
    tickers: { symbol: string; company_name: string; sector: string | null }[];
  };

  const ranked = ((reports as Record<string, unknown>[]) ?? [])
    .map(normalizeReport)
    .map((r) => ({ r, score: reportRelevance(r, q, upper) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.r.views ?? 0) - (a.r.views ?? 0))
    .slice(0, limit)
    .map((x) => x.r);

  return {
    analysts: payload.creators ?? [],
    reports: ranked,
    tickers: (payload.tickers ?? []).map((t) => ({
      ticker: t.symbol,
      name: t.company_name,
      sector: t.sector ?? "",
    })),
  };
}
