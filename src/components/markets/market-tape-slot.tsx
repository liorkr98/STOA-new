import { buildTape } from "@/lib/markets/build-explore";
import { MarketTape } from "@/components/markets/explore-bands";

/** Yahoo-backed tape, streamed so it never blocks the page shell. */
export async function MarketTapeSlot() {
  const quotes = await buildTape().catch(() => []);
  return <MarketTape quotes={quotes} />;
}

export function MarketTapeFallback() {
  return <div className="markets-tape min-h-[2.75rem]" aria-hidden />;
}
