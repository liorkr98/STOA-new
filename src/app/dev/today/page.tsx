import { TodayView } from "@/components/today/today-view";
import { InstrumentSheetProvider } from "@/components/markets/instrument-sheet";
import type { DispatchPayload, DispatchStory } from "@/lib/dispatch/types";
import type { TodayAnalyst, TodayItem, TodayPayload } from "@/lib/today/types";
import type { Prediction, Profile, Report } from "@/lib/types";

/** Dev-only seeded Today so the full band stack can be reviewed without data. */

function profile(id: string, name: string, handle: string, score: number): Profile {
  return {
    id,
    handle,
    display_name: name,
    score,
    sample_size: 24,
    role: "analyst",
    verified: true,
  } as unknown as Profile;
}

function analyst(name: string, handle: string): TodayAnalyst {
  return { handle, displayName: name, avatarUrl: null };
}

const LENA = analyst("Lena Kowalczyk", "lenakw");
const KAI = analyst("Kai Tanaka", "kaitanaka");
const MARCUS = analyst("Marcus Webb", "marcus_webb");
const PRIYA = analyst("Priya Raman", "priya_raman");
const NOOR = analyst("Noor Haddad", "noorhaddad");

function item(
  id: string,
  by: TodayAnalyst,
  type: TodayItem["type"],
  headline: string,
  deck: string | null,
  extra: Partial<TodayItem> = {},
): TodayItem {
  return {
    reportId: id,
    type,
    ticker: null,
    direction: null,
    contentBadge: ["Video", "Cards"],
    headline,
    deck,
    author: by,
    publishedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    access: "free",
    price: null,
    saved: false,
    thumb: null,
    ...extra,
  };
}

const dispatch: DispatchPayload = {
  cycle: {
    issueNumber: 14,
    date: "2026-07-20",
    cycleStart: "2026-07-20T04:00:00.000Z",
    cycleEnd: "2026-07-21T04:00:00.000Z",
    fallbackCycle: false,
  },
  readMinutes: 7,
  personalized: true,
  followedCount: 9,
  lead: {
    report: {
      id: "lead-1",
      ticker: "NVDA",
      title: "Lena Kowalczyk called NVDA +20% and hit it",
      summary:
        "Her Blackwell-demand thesis resolved a full hit today, lifting her to second on the board.",
      access: "subscribers",
      type: "call",
      body: "x",
    } as unknown as Report,
    author: profile("a-lena", "Lena Kowalczyk", "lenakw", 84),
    prediction: {
      id: "p-lead",
      ticker: "NVDA",
      direction: "long",
      outcome: "hit",
      resolves_at: "2026-07-20T20:00:00.000Z",
    } as unknown as Prediction,
    headline: "Lena Kowalczyk called NVDA +20% and hit it",
    dek: "Her Blackwell-demand thesis resolved a full hit today, lifting her to second on the board.",
  } as DispatchStory,
  secondary: [],
  wire: [],
  resolved: [],
};

const today: TodayPayload = {
  desk: {
    subscriptions: [
      item("s1", LENA, "call", "Arm's royalty mix is where the models break", "Every AI accelerator ships an Arm core. The per-unit take is climbing.", {
        ticker: "ARM",
        direction: "long",
        contentBadge: ["Video", "Call", "Cards", "Thesis"],
      }),
      item("s2", KAI, "research", "The refiners nobody is modelling correctly", "Crack spreads held through a quarter that should have crushed them.", {
        ticker: "VLO",
        contentBadge: ["Video", "Cards", "Thesis"],
      }),
      item("s3", PRIYA, "short_post", "What the Iran escalation means for crude", null),
      item("s4", MARCUS, "call", "Shorting the last honest regional bank", "Deposit costs are re-rating faster than the loan book can follow.", {
        ticker: "ZION",
        direction: "short",
        contentBadge: ["Video", "Call", "Cards"],
      }),
    ],
    following: [
      item("f1", NOOR, "call", "Copper is the only clean energy trade left", "Grid capex is inelastic and the supply response is eight years out.", {
        ticker: "FCX",
        direction: "long",
        contentBadge: ["Video", "Call", "Cards"],
      }),
      item("f2", MARCUS, "research", "Insurance float is quietly repricing", "Three years of hard market and reserves still are not catching up.", {
        ticker: "CB",
      }),
      item("f3", KAI, "short_post", "A note on the yen carry unwind", null),
      item("f4", PRIYA, "research", "Semis are not one trade anymore", "Memory, logic, and equipment have stopped moving together.", {
        ticker: "SEMIS" as string,
      }),
    ],
  },
  verdicts: [
    {
      reportId: "v1",
      ticker: "NVDA",
      direction: "long",
      outcome: "hit",
      headline: "Blackwell demand is being underwritten, not forecast",
      entryPrice: 118.4,
      exitPrice: 142.1,
      returnPct: 20.0,
      resolvedAt: "2026-07-20T20:00:00.000Z",
      author: LENA,
    },
    {
      reportId: "v2",
      ticker: "PLUG",
      direction: "short",
      outcome: "hit",
      headline: "The hydrogen subsidy math never closed",
      entryPrice: 3.12,
      exitPrice: 2.04,
      returnPct: 34.6,
      resolvedAt: "2026-07-20T20:00:00.000Z",
      author: NOOR,
    },
    {
      reportId: "v3",
      ticker: "DIS",
      direction: "long",
      outcome: "miss",
      headline: "Parks were supposed to carry the quarter",
      entryPrice: 104.8,
      exitPrice: 96.2,
      returnPct: -8.2,
      resolvedAt: "2026-07-19T20:00:00.000Z",
      author: MARCUS,
    },
    {
      reportId: "v4",
      ticker: "LLY",
      direction: "long",
      outcome: "hit",
      headline: "Supply, not demand, was the only real constraint",
      entryPrice: 742.0,
      exitPrice: 831.5,
      returnPct: 12.1,
      resolvedAt: "2026-07-19T20:00:00.000Z",
      author: PRIYA,
    },
    {
      reportId: "v5",
      ticker: "F",
      direction: "short",
      outcome: "near",
      headline: "The EV writedown was always coming",
      entryPrice: 12.4,
      exitPrice: 11.6,
      returnPct: 6.5,
      resolvedAt: "2026-07-18T20:00:00.000Z",
      author: KAI,
    },
  ],
  saved: [
    {
      ...item("sv1", LENA, "call", "Blackwell demand is being underwritten, not forecast", "The order book is contractual, not indicative.", {
        ticker: "NVDA",
        direction: "long",
        saved: true,
      }),
      reason: "resolved_hit",
      savedAt: "2026-06-02T12:00:00.000Z",
    },
    {
      ...item("sv2", KAI, "research", "The refiners nobody is modelling correctly", "Crack spreads held through a quarter that should have crushed them.", {
        ticker: "VLO",
        saved: true,
      }),
      reason: "follow_up",
      savedAt: "2026-06-18T12:00:00.000Z",
    },
    {
      ...item("sv3", PRIYA, "research", "Semis are not one trade anymore", "Memory, logic, and equipment have stopped moving together.", {
        saved: true,
      }),
      reason: "unread",
      savedAt: "2026-07-01T12:00:00.000Z",
    },
  ],
  mostWatched: [
    {
      reportId: "w1",
      videoId: "w1",
      headline: "Why I am still long copper into a slowdown",
      thumbnailUrl: null,
      durationSeconds: 58,
      ticker: "FCX",
      contentBadge: ["Video", "Call", "Cards"],
      publicationViews: 12400,
      author: NOOR,
    },
    {
      reportId: "w2",
      videoId: "w2",
      headline: "The bank run that did not happen",
      thumbnailUrl: null,
      durationSeconds: 132,
      ticker: "ZION",
      contentBadge: ["Video", "Cards"],
      publicationViews: 9800,
      author: MARCUS,
    },
    {
      reportId: "w3",
      videoId: "w3",
      headline: "Reading the Blackwell order book",
      thumbnailUrl: null,
      durationSeconds: 214,
      ticker: "NVDA",
      contentBadge: ["Video", "Call", "Cards", "Thesis"],
      publicationViews: 8100,
      author: LENA,
    },
    {
      reportId: "w4",
      videoId: "w4",
      headline: "Three minutes on the yen carry unwind",
      thumbnailUrl: null,
      durationSeconds: 176,
      ticker: null,
      contentBadge: ["Video", "Cards"],
      publicationViews: 6400,
      author: KAI,
    },
  ],
  worthReading: [
    item("wr1", analyst("Sofia Marchetti", "sofiam"), "research", "European defence is a supply chain story", "Order backlogs are booked through 2031 and nobody can build faster.", { ticker: "RHM", access: "paid", price: 7 }),
    item("wr2", analyst("Daniel Okonkwo", "danielo"), "call", "Nigeria's banks are the cheapest carry on earth", "A 22% policy rate and a currency that already found its floor.", { ticker: "GTCO", direction: "long", access: "free" }),
    item("wr3", analyst("Hana Lindqvist", "hanal"), "research", "Shipping rates are telling on the consumer", "Transpacific spot fell 40% while retailers still guide up.", { access: "subscribers" }),
    item("wr4", analyst("Tomas Reyes", "tomasr"), "call", "Uranium's contracting cycle has barely started", "Utilities are covered through 2027 and exposed after.", { ticker: "CCJ", direction: "long", access: "paid", price: 5 }),
    item("wr5", analyst("Aisha Bello", "aishab"), "short_post", "A quick note on gold versus real rates", null, { access: "free" }),
    item("wr6", analyst("Ivan Petrov", "ivanp"), "research", "The grid is the bottleneck, not generation", "Interconnection queues are now a decade long in three markets.", { ticker: "PWR", access: "subscribers" }),
  ],
};

export default function DevTodayPage() {
  // The provider normally lives in the (app) layout; the dev harness mounts
  // its own so the sheet can be opened from a headline row here too.
  return (
    <InstrumentSheetProvider>
      <TodayView dispatch={dispatch} today={today} />
    </InstrumentSheetProvider>
  );
}
