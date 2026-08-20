import { getMarketNews } from "@/lib/market/yahoo-news";
import { TodayNews } from "@/components/today/today-front";

/** Wire headlines, streamed so Yahoo search never blocks first byte. */
export async function TodayNewsSlot({ limit = 10 }: { limit?: number }) {
  const items = await getMarketNews(limit);
  return <TodayNews items={items} />;
}
