import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
