import { PriceChart } from "@/components/markets/price-chart";
import { StockHeader } from "@/components/markets/stock-sections";
import type { Candle } from "@/lib/market/candle-types";

/**
 * Dev-only seeded stock page so the price chart can be reviewed without a
 * market-data provider.
 */

const DAY = 86_400;
const NOW = Math.floor(Date.UTC(2026, 7, 16) / 1000);

/** Deterministic walk; no Math.random so the page renders identically twice. */
function candles(): Candle[] {
  const out: Candle[] = [];
  let v = 190;
  for (let i = 260; i >= 0; i--) {
    const t = NOW - i * DAY;
    v += Math.sin(i / 11) * 2.4 + Math.cos(i / 29) * 1.7 + 0.08;
    const close = Math.round(v * 100) / 100;
    out.push({ time: t, open: close, high: close + 1.5, low: close - 1.5, close });
  }
  return out;
}

export default async function DevMarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = "1Y" } = await searchParams;

  return (
    <article className="markets-page mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <StockHeader
        ticker="NVDA"
        name="NVIDIA"
        exchange="NASDAQ"
        currentPrice={225.16}
        changePercent={-0.1}
        marketCap={5.5e12}
        forwardPe={38.4}
        low52={164.07}
        high52={236.54}
      />

      <PriceChart ticker="NVDA" candles={candles()} range={range} />
    </article>
  );
}
