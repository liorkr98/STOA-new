import { createPublicClient } from "@/lib/supabase/public";

/**
 * `company_financials` and `sp_benchmark_bars` are public reference data
 * (migration 0006, `using (true)`), identical for every viewer. They therefore
 * use the cookie-free anon client: these reads run inside cached page builds
 * (the Markets ticker snapshot), and `cookies()` inside a cache scope throws.
 */

export interface FilingRow {
  symbol: string;
  period_end: string;
  frequency: string;
  revenue: number | null;
  net_income: number | null;
  total_assets: number | null;
  eps: number | null;
}

export async function getLatestFiling(symbol: string): Promise<FilingRow | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("company_financials")
    .select("symbol, period_end, frequency, revenue, net_income, total_assets, eps")
    .eq("symbol", symbol.toUpperCase())
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as FilingRow;
}

export async function listFilings(symbol: string, limit = 4): Promise<FilingRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("company_financials")
    .select("symbol, period_end, frequency, revenue, net_income, total_assets, eps")
    .eq("symbol", symbol.toUpperCase())
    .order("period_end", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as FilingRow[];
}

export async function getSpBenchmarkClose(asOf?: Date): Promise<number | null> {
  const supabase = createPublicClient();
  let query = supabase
    .from("sp_benchmark_bars")
    .select("close")
    .order("bar_time", { ascending: false })
    .limit(1);

  if (asOf) {
    query = supabase
      .from("sp_benchmark_bars")
      .select("close")
      .lte("bar_time", asOf.toISOString())
      .order("bar_time", { ascending: false })
      .limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return Number(data.close);
}
