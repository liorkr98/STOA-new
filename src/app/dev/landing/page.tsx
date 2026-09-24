import { LandingPage } from "@/components/landing/landing-page";
import { buildTape } from "@/lib/markets/build-explore";
import type { LandingPayload } from "@/lib/landing/build-landing";

/**
 * Dev-only landing with fixture content: fictional analysts (initials, no
 * portraits), hatched poster instead of a video, invented headlines. The tape
 * is live (Yahoo, no key). Only ever reachable under /dev.
 */
const a = (name: string, handle: string, specialty: string) => ({ handle, displayName: name, avatarUrl: null, specialty });

const FACES = [
  a("Lena Kowalczyk", "lenakw", "Semiconductors and AI infrastructure"),
  a("Priya Nadar", "priyanadar", "Semis, memory, equipment"),
  a("Kai Tanaka", "kaitanaka", "Energy and refiners"),
  a("Marcus Webb", "marcus_webb", "Regional banks and insurance"),
  a("Noor Haddad", "noorhaddad", "Industrial metals and the grid"),
  a("Dana Fixture", "danafixture", "Semiconductor supply chains"),
  a("Omar Fixture", "omarfixture", "Integrated oil and gas"),
  a("Iris Fixture", "irisfixture", "Financials"),
  a("Tomer Fixture", "tomerfixture", "Israeli tech"),
  a("Yael Fixture", "yaelfixture", "Software"),
  a("Ravi Fixture", "ravifixture", "Payments"),
  a("Sofia Fixture", "sofiafixture", "Healthcare"),
  a("Jonas Fixture", "jonasfixture", "Autos"),
  a("Mira Fixture", "mirafixture", "Media"),
  a("Eli Fixture", "elifixture", "Consumer"),
  a("Hana Fixture", "hanafixture", "Materials"),
  a("Leo Fixture", "leofixture", "Hardware"),
  a("Nadia Fixture", "nadiafixture", "Internet"),
  a("Ben Fixture", "benfixture", "Macro"),
  a("Zoe Fixture", "zoefixture", "Rates and FX"),
  a("Amir Fixture", "amirfixture", "Defense"),
  a("Ines Fixture", "inesfixture", "Space"),
  a("Kofi Fixture", "kofifixture", "Energy transition"),
  a("Maya Fixture", "mayafixture", "Short theses"),
];

export default async function DevLandingPage() {
  const tape = await buildTape().catch(() => []);
  const data: LandingPayload = {
    activity: { publicationsToday: 37, analystsToday: 14, window: "today" },
    tape,
    issue: { issueNumber: 41, dateISO: "2026-08-18" },
    lead: {
      reportId: "x1",
      kicker: "SEMICONDUCTORS",
      headline: "Blackwell demand is still under-modelled into the January quarter",
      analyst: "Lena Kowalczyk",
      ticker: "NVDA",
      direction: "long",
      embedUrl: null,
      playbackUrl: "/demo/clips/clip-01.mp4",
      thumbnailUrl: "/demo/clips/clip-01.jpg",
      analystId: "lenakw",
    },
    headlines: [
      { reportId: "x2", kicker: "ENERGY", headline: "The refiners nobody is modelling correctly", analyst: "Kai Tanaka", ticker: "VLO", direction: "long" },
      { reportId: "x3", kicker: "MACRO · OIL & ENERGY", headline: "What the Strait of Hormuz headlines mean for crude this week", analyst: "Priya Nadar", ticker: null, direction: null },
      { reportId: "x4", kicker: "FINANCIALS", headline: "Shorting the last honest regional bank", analyst: "Marcus Webb", ticker: "ZION", direction: "short" },
      { reportId: "x5", kicker: "MATERIALS", headline: "Copper is the only clean energy trade left", analyst: "Noor Haddad", ticker: "FCX", direction: "long" },
    ],
    faces: FACES,
  };
  return <LandingPage data={data} />;
}
