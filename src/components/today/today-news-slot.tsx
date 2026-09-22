import { getMarketNews } from "@/lib/market/yahoo-news";
import { TodayNews } from "@/components/today/today-news";
import { NewsSheet } from "@/components/today/today-sections";

/**
 * Wire headlines, streamed so Yahoo search never blocks first byte. Today
 * draws them in its sheet anatomy; Markets keeps the band.
 */
export async function TodayNewsSlot({ limit = 10, variant = "band" }: { limit?: number; variant?: "band" | "sheet" }) {
  const items = await getMarketNews(limit);
  return variant === "sheet" ? <NewsSheet items={items} className="ts-section" /> : <TodayNews items={items} />;
}
