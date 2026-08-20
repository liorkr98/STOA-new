import { CallsChart } from "@/components/markets/calls-chart";
import { EtfHeader, EtfHoldings, EtfSectorExposure } from "@/components/markets/etf-sections";
import {
  StockCoverageBlock,
  StockOpenCalls,
  StockPublications,
  StockResolvedHistory,
} from "@/components/markets/stock-sections";
import type { Candle } from "@/lib/market/candle-types";
import type { EtfSnapshot } from "@/lib/markets/build-etf";
import type { StockCallsPayload } from "@/lib/markets/build-stock";
import type { TodayItem } from "@/lib/today/types";

/**
 * A fund page. Same call-annotation chart and same Stoa activity components as
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
  calls,
  publications,
  coverage,
  range,
  customFrom,
  customTo,
}: {
  etf: EtfSnapshot;
  candles: Candle[];
  calls: StockCallsPayload;
  publications: TodayItem[];
  coverage: Record<string, number>;
  range: string;
  customFrom?: string;
  customTo?: string;
}) {
  return (
    <article className="markets-page mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <EtfHeader etf={etf} />

      <CallsChart
        ticker={etf.symbol}
        candles={candles}
        openCalls={calls.openCalls}
        resolvedCalls={calls.resolvedCalls}
        range={range}
        customFrom={customFrom}
        customTo={customTo}
      />

      <EtfHoldings holdings={etf.holdings} coverage={coverage} />
      <EtfSectorExposure weights={etf.sectorWeights} />

      <StockCoverageBlock ticker={etf.symbol} coverage={calls.coverage} />
      <StockOpenCalls calls={calls.openCalls} />
      <StockPublications items={publications} />
      <StockResolvedHistory calls={calls.resolvedCalls} />

      {calls.openCalls.length === 0 && publications.length === 0 ? (
        <p className="markets-empty">
          No Stoa coverage on {etf.symbol} yet. When an analyst publishes on this fund it will
          show up here.
        </p>
      ) : null}
    </article>
  );
}
