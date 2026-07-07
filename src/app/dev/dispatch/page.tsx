import { DispatchView } from "@/components/dispatch/dispatch-view";
import type { DispatchPayload, DispatchStory } from "@/lib/dispatch/types";
import type { Prediction, Profile, Report } from "@/lib/types";

/** Dev-only seeded dispatch so the full front page can be reviewed without data. */

function analyst(id: string, name: string, handle: string, score: number): Profile {
  return {
    id,
    handle,
    display_name: name,
    score,
    role: "analyst",
    verified: true,
  } as unknown as Profile;
}

function story(
  id: string,
  author: Profile,
  ticker: string,
  headline: string,
  dek: string | null,
  target?: number,
): DispatchStory {
  const prediction = target
    ? ({
        id: `p-${id}`,
        ticker,
        direction: "long",
        target_price: target,
        target_horizon_date: "2026-10-02",
      } as unknown as Prediction)
    : null;
  return {
    report: { id, ticker, title: headline, summary: dek } as unknown as Report,
    author,
    prediction,
    headline,
    dek,
  };
}

const chen = analyst("a1", "Sarah Chen", "sarahchen", 82);
const webb = analyst("a2", "Marcus Webb", "marcuswebb", 61);
const vos = analyst("a3", "Maren Vos", "marenvos", 74);
const ito = analyst("a4", "Kenji Ito", "kenjiito", 47);
const roy = analyst("a5", "Anika Roy", "anikaroy", 68);

const payload: DispatchPayload = {
  cycle: {
    issueNumber: 142,
    date: "2026-07-07",
    cycleStart: new Date().toISOString(),
    cycleEnd: new Date().toISOString(),
    fallbackCycle: false,
  },
  readMinutes: 4,
  personalized: true,
  followedCount: 12,
  lead: story(
    "r1",
    chen,
    "NVDA",
    "The AI capex cycle has further to run than the market believes",
    "Hyperscaler guidance implies a 2027 build-out the street still models as a 2025 peak. The gap between those two curves is the whole trade.",
    210,
  ),
  secondary: [
    story(
      "r2",
      webb,
      "TSLA",
      "Margin compression is the real Q3 story",
      "Price cuts bought share but the energy segment cannot cover the spread forever.",
      145,
    ),
    story(
      "r3",
      vos,
      "ASML",
      "High-NA adoption is slipping right and nobody repriced",
      "Two of three lead customers pushed pilot lines into 2027. The consensus deck has not moved.",
      880,
    ),
    story(
      "r4",
      ito,
      "XOM",
      "Permian decline rates are the quiet bull case for majors",
      null,
      128,
    ),
    story(
      "r5",
      roy,
      "SHOP",
      "Take-rate expansion has one more leg",
      "Payments attach is still 20 points below ceiling in Europe.",
      92,
    ),
  ],
  wire: [
    story("r6", webb, "AMD", "MI400 sampling timelines look real this time", null),
    story("r7", chen, "MSFT", "Copilot seat growth is decelerating inside the enterprise", null),
    story("r8", vos, "NOVO", "GLP-1 supply catches demand in Q1, then price war", null),
    story("r9", roy, "JPM", "NII guide is sandbagged by 200bp of polite pessimism", null),
    story("r10", ito, "7203", "Toyota's hybrid moat outlasts the EV plateau", null),
    story("r11", chen, "GOOGL", "Search margins survive the AI overview rollout", null),
  ],
  resolved: [
    {
      ticker: "AAPL",
      authorHandle: "sarahchen",
      authorName: "Sarah Chen",
      targetPrice: 210,
      resolvedPrice: 214.3,
      returnPct: 8.4,
      outcome: "hit",
      resolvedAt: "2026-07-07T14:00:00Z",
      reportId: "r20",
    },
    {
      ticker: "AMD",
      authorHandle: "marcuswebb",
      authorName: "Marcus Webb",
      targetPrice: 145,
      resolvedPrice: 138.1,
      returnPct: -4.7,
      outcome: "miss",
      resolvedAt: "2026-07-07T14:00:00Z",
      reportId: "r21",
    },
    {
      ticker: "SHOP",
      authorHandle: "anikaroy",
      authorName: "Anika Roy",
      targetPrice: 88,
      resolvedPrice: 87.2,
      returnPct: 5.1,
      outcome: "near",
      resolvedAt: "2026-07-07T14:00:00Z",
      reportId: "r22",
    },
  ],
  leaderboard: [
    { analyst: chen, resolvedCalls: 34 },
    { analyst: vos, resolvedCalls: 27 },
    { analyst: roy, resolvedCalls: 19 },
    { analyst: webb, resolvedCalls: 41 },
    { analyst: ito, resolvedCalls: 8 },
  ],
};

export default function DispatchPreviewPage() {
  return <DispatchView dispatch={payload} mode="public" />;
}
