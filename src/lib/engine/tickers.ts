import { createAdminClient } from "@/lib/supabase/admin";
import { UNIVERSE } from "@/lib/universe";

export type TickerStatus = "active" | "delisted" | "acquired";

export interface TickerMeta {
  symbol: string;
  name: string;
  sector: string | null;
  exchange: string;
  timezone: string;
  status: TickerStatus;
}

const DEFAULT_TZ = "America/New_York";

const FALLBACK: Record<string, TickerMeta> = Object.fromEntries(
  UNIVERSE.map((u) => [
    u.ticker,
    {
      symbol: u.ticker,
      name: u.name,
      sector: u.sector,
      exchange: "NASDAQ",
      timezone: DEFAULT_TZ,
      status: "active" as const,
    },
  ]),
);

/** Loads ticker metadata from DB; falls back to curated universe defaults. */
export async function getTickerMeta(symbol: string): Promise<TickerMeta> {
  const sym = symbol.toUpperCase();
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("tickers").select("*").eq("symbol", sym).maybeSingle();
    if (data) {
      return {
        symbol: data.symbol,
        name: data.name,
        sector: data.sector,
        exchange: data.exchange,
        timezone: data.timezone,
        status: data.status as TickerStatus,
      };
    }
  } catch {
    // Table may not exist before migration 0018.
  }
  return FALLBACK[sym] ?? {
    symbol: sym,
    name: sym,
    sector: null,
    exchange: "NYSE",
    timezone: DEFAULT_TZ,
    status: "active",
  };
}
