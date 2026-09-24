import { DispatchView } from "@/components/dispatch/dispatch-view";
import type { DispatchPayload, DispatchStory } from "@/lib/dispatch/types";
import type { Profile, Report } from "@/lib/types";

/** Dev-only seeded dispatch so the full front page can be reviewed without data. */

function analyst(id: string, name: string, handle: string): Profile {
  return {
    id,
    handle,
    display_name: name,
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
  stance?: "long" | "short",
): DispatchStory {
  return {
    report: { id, ticker, stance: stance ?? null, title: headline, summary: dek } as unknown as Report,
    author,
    headline,
    dek,
  };
}

const chen = analyst("a1", "Sarah Chen", "sarahchen");
const webb = analyst("a2", "Marcus Webb", "marcuswebb");
const vos = analyst("a3", "Maren Vos", "marenvos");
const ito = analyst("a4", "Kenji Ito", "kenjiito");
const roy = analyst("a5", "Anika Roy", "anikaroy");

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
    "long",
  ),
  secondary: [
    story(
      "r2",
      webb,
      "TSLA",
      "Margin compression is the real Q3 story",
      "Price cuts bought share but the energy segment cannot cover the spread forever.",
      "long",
    ),
    story(
      "r3",
      vos,
      "ASML",
      "High-NA adoption is slipping right and nobody repriced",
      "Two of three lead customers pushed pilot lines into 2027. The consensus deck has not moved.",
      "long",
    ),
    story(
      "r4",
      ito,
      "XOM",
      "Permian decline rates are the quiet bull case for majors",
      null,
      "long",
    ),
    story(
      "r5",
      roy,
      "SHOP",
      "Take-rate expansion has one more leg",
      "Payments attach is still 20 points below ceiling in Europe.",
      "long",
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
};

export default function DispatchPreviewPage() {
  return <DispatchView dispatch={payload} mode="public" />;
}
