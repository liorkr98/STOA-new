import { createClient } from "@/lib/supabase/server";
import type { Profile, Report } from "@/lib/types";
import { UNIVERSE } from "@/lib/universe";

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

  const tickers = UNIVERSE.filter(
    (u) =>
      u.ticker.includes(upper) ||
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.sector.toLowerCase().includes(q.toLowerCase()),
  ).slice(0, limit);

  const [{ data: analysts }, { data: reports }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "analyst")
      .or(`display_name.ilike.%${q}%,handle.ilike.%${q}%,headline.ilike.%${q}%`)
      .order("rating", { ascending: false })
      .limit(limit),
    supabase
      .from("reports")
      .select(REPORT_SELECT)
      .eq("status", "published")
      .or(`title.ilike.%${q}%,summary.ilike.%${q}%,ticker.ilike.%${upper}%`)
      .order("published_at", { ascending: false })
      .limit(limit),
  ]);

  return {
    analysts: (analysts as Profile[]) ?? [],
    reports: ((reports as Record<string, unknown>[]) ?? []).map(normalizeReport),
    tickers,
  };
}
