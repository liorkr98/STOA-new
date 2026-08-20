/**
 * Curated funds for the Markets Explore band, editorial in the same way
 * `MARKET_THEMES` is. Edit this list to change what the band features; no
 * schema change and no deploy-time codegen involved.
 *
 * This list does NOT gate the ETF page. Any symbol the market data provider
 * recognizes as a fund resolves live, so a reader searching a ticker that is
 * not listed here still reaches a real page.
 */
export interface CuratedEtf {
  symbol: string;
  name: string;
}

export const CURATED_ETFS: CuratedEtf[] = [
  { symbol: "SPY", name: "SPDR S&P 500" },
  { symbol: "QQQ", name: "Invesco QQQ, Nasdaq 100" },
  { symbol: "VOO", name: "Vanguard S&P 500" },
  { symbol: "VTI", name: "Vanguard Total Stock Market" },
  { symbol: "IWM", name: "iShares Russell 2000" },
  { symbol: "DIA", name: "SPDR Dow Jones" },
  { symbol: "SMH", name: "VanEck Semiconductor" },
  { symbol: "XLE", name: "Energy Select Sector" },
  { symbol: "XLF", name: "Financial Select Sector" },
  { symbol: "XLK", name: "Technology Select Sector" },
  { symbol: "SOXL", name: "Direxion Semiconductor Bull 3x" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury" },
  { symbol: "GLD", name: "SPDR Gold Shares" },
  { symbol: "VXX", name: "iPath VIX Short-Term Futures" },
  { symbol: "ARKK", name: "ARK Innovation" },
];

/** How many the Explore band features. The rest arrive through search. */
export const ETF_BAND_SIZE = 5;

export function curatedEtf(symbol: string): CuratedEtf | undefined {
  return CURATED_ETFS.find((e) => e.symbol === symbol.toUpperCase());
}
