import Link from "next/link";
import { CallsChart } from "@/components/markets/calls-chart";
import { DayChange } from "@/components/markets/day-change";
import { FollowTicker } from "@/components/markets/follow-control";
import {
  StockCoverageBlock,
  StockOpenCalls,
  StockPublications,
  StockResolvedHistory,
} from "@/components/markets/stock-sections";
import { formatMacroLevel, type MacroInstrument } from "@/lib/markets/instruments";
import type { Candle } from "@/lib/market/candle-types";
import type { StockCallsPayload } from "@/lib/markets/build-stock";
import type { TodayItem } from "@/lib/today/types";

const KIND_LABEL: Record<MacroInstrument["kind"], string> = {
  commodity: "Commodity",
  rate: "Government bond yield",
  crypto: "Macro asset",
};

/**
 * A macro instrument page. It carries the same annotated chart and the same
 * Stoa activity blocks as a stock, and drops the company facts entirely:
 * gold has no market cap and a Treasury yield has no earnings, so the meta
 * row is replaced by what a level here actually means rather than rendered
 * with blanks.
 */
export function MacroView({
  instrument,
  price,
  changePercent,
  candles,
  calls,
  publications,
  range,
  customFrom,
  customTo,
}: {
  instrument: MacroInstrument;
  price: number | null;
  changePercent: number | null;
  candles: Candle[];
  calls: StockCallsPayload;
  publications: TodayItem[];
  range: string;
  customFrom?: string;
  customTo?: string;
}) {
  const level = formatMacroLevel(instrument, price);

  return (
    <article className="markets-page mx-auto w-full max-w-[var(--w-wide)] py-10 sm:py-14">
      <header>
        <Link href="/markets" className="markets-crumb focus-ring">
          <span aria-hidden>←</span> Markets
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="stock-name">{instrument.name}</h1>
            <p className="stock-sub">
              {instrument.symbol}
              <span aria-hidden> · </span>
              {KIND_LABEL[instrument.kind]}
              <span aria-hidden> · </span>
              {instrument.unit}
            </p>
          </div>

          <div className="flex items-end gap-4">
            <span className="stock-price">
              {level == null ? <span className="markets-pending">No level</span> : level}
            </span>
            <DayChange percent={changePercent} size="lg" />
            <FollowTicker ticker={instrument.symbol} className="mb-1" />
          </div>
        </div>

        <p className="mt-5 max-w-[62ch] text-[0.9375rem] leading-relaxed text-text-mute">
          {instrument.about}
        </p>

        {instrument.directionNote ? (
          <p className="mt-3 max-w-[62ch] rounded-[var(--radius-card)] border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-3 py-2 text-[0.8125rem] leading-relaxed text-text">
            {instrument.directionNote}
          </p>
        ) : null}
      </header>

      <CallsChart
        ticker={instrument.symbol}
        candles={candles}
        openCalls={calls.openCalls}
        resolvedCalls={calls.resolvedCalls}
        range={range}
        customFrom={customFrom}
        customTo={customTo}
      />

      <StockCoverageBlock ticker={instrument.symbol} coverage={calls.coverage} />
      <StockOpenCalls calls={calls.openCalls} />
      <StockPublications items={publications} />
      <StockResolvedHistory calls={calls.resolvedCalls} />

      {calls.openCalls.length === 0 && publications.length === 0 ? (
        <p className="markets-empty">
          No Stoa coverage on {instrument.name} yet. When an analyst publishes on this
          instrument it will show up here.
        </p>
      ) : null}
    </article>
  );
}
