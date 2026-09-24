import { PriceChart } from "@/components/markets/price-chart";
import { EtfHeader, EtfHoldings, EtfSectorExposure } from "@/components/markets/etf-sections";
import { StockPublications } from "@/components/markets/stock-sections";
import type { Candle } from "@/lib/market/candle-types";
import type { EtfSnapshot } from "@/lib/markets/build-etf";
import type { TodayItem } from "@/lib/today/types";

/**
 * A fund page. Same price chart and same Stoa activity components as
 * a stock, but fund facts in the header and holdings/exposure in place of
 * fundamentals.
 *
 * Net flows are absent by design rather than omission: the market data
 * provider publishes no inflow/outflow series for any fund, so there is no
 * honest bar strip to draw and the section does not render.
 */
export function EtfView({
  etf,
  candles,
  publications,
  coverage,
  range,
  customFrom,
  customTo,
}: {
  etf: EtfSnapshot;
  candles: Candle[];
  publications: TodayItem[];
  coverage: Record<string, number>;
  range: string;
  customFrom?: string;
  customTo?: string;
}) {
  return (
    <article className="markets-page mx-auto w-full max-w-[var(--w-wide)] py-10 sm:py-14">
      <EtfHeader etf={etf} />

      <PriceChart
        ticker={etf.symbol}
        candles={candles}
        range={range}
        customFrom={customFrom}
        customTo={customTo}
      />

      <EtfHoldings holdings={etf.holdings} coverage={coverage} />
      <EtfSectorExposure weights={etf.sectorWeights} />

      <StockPublications items={publications} />

      {publications.length === 0 ? (
        <p className="markets-empty">
          No Stoa coverage on {etf.symbol} yet. When an analyst publishes on this fund it will
          show up here.
        </p>
      ) : null}
    </article>
  );
}
