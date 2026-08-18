import { TodayPage } from "@/components/today/today-page";
import { InstrumentSheetProvider } from "@/components/markets/instrument-sheet";
import { getMarketNews } from "@/lib/market/yahoo-news";
import type {
  TodayAnalyst,
  TodayCreatorRow,
  TodayDeskItem,
  TodayItem,
  TodayPagePayload,
  TodayTickerRow,
  TodayVerdict,
} from "@/lib/today/types";

/**
 * Dev-only seeded Today so the full front page can be reviewed without data.
 * Fixture-only: fictional analysts with no photos, hatched posters instead of
 * thumbnails, fake durations. Market news is real (Yahoo, no key) so the band
 * shows its true shape. `?state=empty` renders the signed-out, no-desk issue.
 */

const NOW = Date.parse("2026-08-18T14:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

const analyst = (name: string, handle: string): TodayAnalyst => ({ handle, displayName: name, avatarUrl: null });
const LENA = analyst("Lena Kowalczyk", "lenakw");
const KAI = analyst("Kai Tanaka", "kaitanaka");
const MARCUS = analyst("Marcus Webb", "marcus_webb");
const PRIYA = analyst("Priya Nadar", "priyanadar");
const NOOR = analyst("Noor Haddad", "noorhaddad");
const DANA = analyst("Dana Fixture", "danafixture");

function item(
  id: string,
  by: TodayAnalyst,
  type: TodayItem["type"],
  headline: string,
  deck: string | null,
  extra: Partial<TodayItem> & { hours?: number; secs?: number } = {},
): TodayItem {
  const { hours = 3, secs, ...rest } = extra;
  const hasCall = Boolean(rest.ticker);
  const badge = [secs ? "Video" : null, hasCall ? "Call" : null, type === "research" ? "Thesis" : null].filter(Boolean) as string[];
  return {
    reportId: id,
    type,
    ticker: null,
    direction: null,
    contentBadge: badge.length ? badge : ["Note"],
    headline,
    deck,
    author: by,
    publishedAt: hoursAgo(hours),
    access: "free",
    price: null,
    saved: false,
    thumb: secs ? { thumbnailUrl: null, durationSeconds: secs } : null,
    themeTag: null,
    stageMarker: null,
    sector: null,
    ...rest,
  };
}

const lead = item("t-lead", LENA, "call", "Blackwell demand is still under-modelled into the January quarter", "Hyperscaler capex guides imply a supply-constrained first half; the Street's unit assumptions have not caught up.", {
  ticker: "NVDA", direction: "long", sector: "Semiconductors", secs: 222, hours: 2, stageMarker: "TRENDING",
});
const secondary = [
  item("t-s1", KAI, "research", "The refiners nobody is modelling correctly", null, { ticker: "VLO", direction: "long", sector: "Energy", hours: 4 }),
  item("t-s2", PRIYA, "short_post", "What the Strait of Hormuz headlines mean for crude this week", null, { sector: "Energy", secs: 95, hours: 5, themeTag: "MACRO · OIL & ENERGY" }),
  item("t-s3", MARCUS, "call", "Shorting the last honest regional bank", null, { ticker: "ZION", direction: "short", sector: "Financials", hours: 7 }),
];
const trending: TodayItem[] = [
  item("tr1", NOOR, "call", "Copper is the only clean energy trade left", null, { ticker: "FCX", direction: "long", sector: "Materials", secs: 140, hours: 6 }),
  item("tr2", DANA, "call", "Micron: HBM pricing holds through the cycle", null, { ticker: "MU", direction: "long", sector: "Semiconductors", secs: 187, hours: 9, stageMarker: "NEW" }),
  item("tr3", KAI, "short_post", "A note on the yen carry unwind", null, { secs: 71, hours: 10, themeTag: "MACRO · RATES" }),
  item("tr4", MARCUS, "research", "Insurance float is quietly repricing", null, { ticker: "CB", direction: "long", sector: "Financials", hours: 12 }),
  item("tr5", PRIYA, "call", "Semis are not one trade anymore", null, { ticker: "SMH", direction: "long", sector: "Semiconductors", secs: 200, hours: 14 }),
  item("tr6", LENA, "call", "AMD's MI350 window is narrower than the bulls think", null, { ticker: "AMD", direction: "short", sector: "Semiconductors", secs: 301, hours: 20 }),
  item("tr7", NOOR, "research", "Grid capex is the decade's quietest compounder", null, { ticker: "ETN", direction: "long", sector: "Industrials", hours: 22 }),
  item("tr8", DANA, "short_post", "Reading the SOX breadth chart", null, { secs: 60, hours: 26, stageMarker: "NEW" }),
  item("tr9", KAI, "call", "Valero into the turnaround season", null, { ticker: "VLO", direction: "long", sector: "Energy", hours: 30 }),
  item("tr10", MARCUS, "call", "Zions: the deposit beta problem", null, { ticker: "ZION", direction: "short", sector: "Financials", hours: 33 }),
  item("tr11", PRIYA, "research", "ASML after the bookings trough", null, { ticker: "ASML", direction: "long", sector: "Semiconductors", hours: 40 }),
  item("tr12", LENA, "call", "TSMC's N2 ramp is the capex the market is not pricing", null, { ticker: "TSM", direction: "long", sector: "Semiconductors", secs: 240, hours: 44 }),
];
const desk: TodayDeskItem[] = [
  { ...item("d1", PRIYA, "call", "Arm's royalty mix is where the models break", null, { ticker: "ARM", direction: "long", secs: 180, hours: 3 }), relationship: "member" },
  { ...item("d2", LENA, "research", "The written case on Blackwell supply", null, { ticker: "NVDA", direction: "long", secs: 260, hours: 8 }), relationship: "following" },
  { ...item("d3", KAI, "short_post", "Crack spreads, one chart", null, { secs: 55, hours: 11 }), relationship: "member" },
  { ...item("d4", NOOR, "call", "Freeport at the top of the copper curve", null, { ticker: "FCX", direction: "long", secs: 130, hours: 19 }), relationship: "following" },
  { ...item("d5", MARCUS, "call", "Regional banks: the next shoe", null, { ticker: "KRE", direction: "short", secs: 95, hours: 27 }), relationship: "following" },
];
const verdicts: TodayVerdict[] = [
  { reportId: "v1", ticker: "NVDA", direction: "long", outcome: "hit", headline: "Blackwell demand is being underwritten, not forecast", entryPrice: 118.4, exitPrice: 142.1, returnPct: 20.0, resolvedAt: hoursAgo(5), author: LENA },
  { reportId: "v2", ticker: "AMD", direction: "short", outcome: "near", headline: "The MI350 share-gain story runs out of road", entryPrice: 162.1, exitPrice: 158.9, returnPct: 1.98, resolvedAt: hoursAgo(9), author: LENA },
  { reportId: "v3", ticker: "ASML", direction: "long", outcome: "miss", headline: "Bookings trough was the second quarter", entryPrice: 712.4, exitPrice: 665.2, returnPct: -6.6, resolvedAt: hoursAgo(28), author: PRIYA },
  { reportId: "v4", ticker: "XOM", direction: "long", outcome: "hit", headline: "Supply discipline holds through the summer", entryPrice: 104.2, exitPrice: 118.7, returnPct: 13.9, resolvedAt: hoursAgo(31), author: KAI },
  { reportId: "v5", ticker: "ZION", direction: "short", outcome: "miss", headline: "The deposit beta squeeze", entryPrice: 44.1, exitPrice: 47.9, returnPct: -8.6, resolvedAt: hoursAgo(50), author: MARCUS },
  { reportId: "v6", ticker: "FCX", direction: "long", outcome: "hit", headline: "Copper into the summer restock", entryPrice: 41.2, exitPrice: 48.9, returnPct: 18.7, resolvedAt: hoursAgo(70), author: NOOR },
];
const theme = {
  slug: "ai-buildout",
  name: "The AI buildout",
  publicationsThisWeek: 7,
  items: [lead, trending[1], trending[4], trending[5], trending[10], trending[11]],
};

const creator = (a: TodayAnalyst, marker: TodayCreatorRow["marker"] = null, suggestion = false): TodayCreatorRow => ({
  id: `fx-${a.handle}`, handle: a.handle, displayName: a.displayName, avatarUrl: null, marker, suggestion,
});
const tick = (symbol: string, price: number, publications: number, suggestion = false): TodayTickerRow => ({
  symbol, price, changePercent: null, publications, suggestion,
});

export default async function DevTodayPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const signedOut = state === "empty";
  const news = await getMarketNews(10);

  const data: TodayPagePayload = {
    issue: { issueNumber: 41, dateISO: "2026-08-18" },
    personalized: !signedOut,
    lead,
    secondary,
    trending,
    desk: signedOut ? [] : desk,
    verdicts,
    theme,
    news,
    sidebar: {
      trendingCreators: [creator(LENA, "TRENDING"), creator(DANA, "NEW"), creator(NOOR), creator(KAI), creator(PRIYA)],
      popularCreators: [creator(PRIYA), creator(LENA), creator(MARCUS), creator(KAI), creator(NOOR), creator(DANA, "NEW")],
      trendingTickers: [tick("NVDA", 131.42, 14), tick("MU", 121.7, 6), tick("FCX", 48.9, 5), tick("VLO", 152.3, 4), tick("ZION", 47.9, 3), tick("SMH", 262.1, 3)],
      popularTickers: [tick("NVDA", 131.42, 41), tick("AAPL", 229.8, 27), tick("MSFT", 418.2, 22), tick("AMD", 158.9, 19), tick("TSLA", 244.6, 17), tick("AMZN", 186.1, 12), tick("META", 512.4, 11)],
      memberships: signedOut ? [] : [creator(PRIYA), creator(KAI)],
      following: signedOut ? [] : [creator(LENA), creator(NOOR), creator(MARCUS)],
      suggestedCreators: [creator(DANA, "NEW", true), creator(NOOR, null, true), creator(MARCUS, null, true)],
      suggestedTickers: [tick("NVDA", 131.42, 41, true), tick("AAPL", 229.8, 27, true), tick("MSFT", 418.2, 22, true), tick("AMD", 158.9, 19, true)],
      signedIn: !signedOut,
    },
  };

  return (
    <InstrumentSheetProvider>
      <div className="mx-auto w-full max-w-[1200px] px-5 py-8">
        <TodayPage data={data} />
      </div>
    </InstrumentSheetProvider>
  );
}
