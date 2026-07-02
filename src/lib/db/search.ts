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

export async function searchAll(query: string, limit = 8): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { analysts: [], reports: [], tickers: [] };

  const supabase = await createClient();
  const upper = q.toUpperCase();

  const [{ data: platform }, { data: reports }] = await Promise.all([
    supabase.rpc("search_platform", { p_query: q, p_limit: limit }),
    supabase
      .from("reports")
      .select(REPORT_SELECT)
      .eq("status", "published")
      .or(`title.ilike.%${q}%,summary.ilike.%${q}%,ticker.ilike.%${upper}%`)
      .order("published_at", { ascending: false })
      .limit(limit),
  ]);

  const payload = (platform ?? { creators: [], tickers: [] }) as {
    creators: Profile[];
    tickers: { symbol: string; company_name: string; sector: string | null }[];
  };

  return {
    analysts: payload.creators ?? [],
    reports: ((reports as Record<string, unknown>[]) ?? []).map(normalizeReport),
    tickers: (payload.tickers ?? []).map((t) => ({
      ticker: t.symbol,
      name: t.company_name,
      sector: t.sector ?? "",
    })),
  };
}
