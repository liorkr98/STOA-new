import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.toUpperCase() ?? "SPY";
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - 180 * 86_400;
    const history = await yf.chart(ticker, { period1: start, period2: end, interval: "1d" });
    const quotes = history.quotes?.filter((q) => q.close != null) ?? [];
    const points = quotes.slice(-30).map((q) => q.close as number);
    return NextResponse.json({ ticker, points });
  } catch {
    return NextResponse.json({ ticker, points: [] });
  }
}
