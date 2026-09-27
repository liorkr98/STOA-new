import { getMarketNews } from "@/lib/market/yahoo-news";
import { TodayNews } from "@/components/today/today-news";
import { NewsBand } from "@/components/today/today-sections";

/**
 * Wire headlines, streamed so Yahoo search never blocks first byte. Today
 * draws them as its own band; Markets keeps its band form.
 */
export async function TodayNewsSlot({ limit = 10, variant = "band" }: { limit?: number; variant?: "band" | "today" }) {
  const items = await getMarketNews(limit);
  return variant === "today" ? <NewsBand items={items} className="today-band" /> : <TodayNews items={items} />;
}
