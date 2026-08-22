import { LandingPage } from "@/components/landing/landing-page";
import { buildTape } from "@/lib/markets/build-explore";
import type { LandingPayload } from "@/lib/landing/build-landing";

/**
 * Dev-only landing with fixture content: fictional analysts (initials, no
 * portraits), hatched poster instead of a video, invented headlines. The tape
 * is live (Yahoo, no key). Only ever reachable under /dev.
 */
const NOW = Date.parse("2026-08-18T14:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
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
    activity: { publicationsToday: 37, analystsToday: 14, callsResolvedToday: 6 },
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
      thumbnailUrl: null,
      analystId: "lenakw",
    },
    headlines: [
      { reportId: "x2", kicker: "ENERGY", headline: "The refiners nobody is modelling correctly", analyst: "Kai Tanaka", ticker: "VLO", direction: "long" },
      { reportId: "x3", kicker: "MACRO · OIL & ENERGY", headline: "What the Strait of Hormuz headlines mean for crude this week", analyst: "Priya Nadar", ticker: null, direction: null },
      { reportId: "x4", kicker: "FINANCIALS", headline: "Shorting the last honest regional bank", analyst: "Marcus Webb", ticker: "ZION", direction: "short" },
      { reportId: "x5", kicker: "MATERIALS", headline: "Copper is the only clean energy trade left", analyst: "Noor Haddad", ticker: "FCX", direction: "long" },
    ],
    verdicts: [
      { reportId: "v1", ticker: "NVDA", direction: "long", outcome: "hit", headline: "Blackwell demand is being underwritten, not forecast", entryPrice: 118.4, exitPrice: 142.1, returnPct: 20.0, resolvedAt: hoursAgo(5), author: { id: "lenakw", handle: "lenakw", displayName: "Lena Kowalczyk", avatarUrl: null } },
      { reportId: "v4", ticker: "XOM", direction: "long", outcome: "hit", headline: "Supply discipline holds through the summer", entryPrice: 104.2, exitPrice: 118.7, returnPct: 13.9, resolvedAt: hoursAgo(31), author: { id: "kaitanaka", handle: "kaitanaka", displayName: "Kai Tanaka", avatarUrl: null } },
      { reportId: "v3", ticker: "ASML", direction: "long", outcome: "miss", headline: "Bookings trough was the second quarter", entryPrice: 712.4, exitPrice: 665.2, returnPct: -6.6, resolvedAt: hoursAgo(28), author: { id: "priyanadar", handle: "priyanadar", displayName: "Priya Nadar", avatarUrl: null } },
      { reportId: "v6", ticker: "FCX", direction: "long", outcome: "hit", headline: "Copper into the summer restock", entryPrice: 41.2, exitPrice: 48.9, returnPct: 18.7, resolvedAt: hoursAgo(70), author: { id: "noorhaddad", handle: "noorhaddad", displayName: "Noor Haddad", avatarUrl: null } },
      { reportId: "v2", ticker: "AMD", direction: "short", outcome: "near", headline: "The MI350 share-gain story runs out of road", entryPrice: 162.1, exitPrice: 158.9, returnPct: 1.98, resolvedAt: hoursAgo(9), author: { id: "lenakw", handle: "lenakw", displayName: "Lena Kowalczyk", avatarUrl: null } },
    ],
    faces: FACES,
  };
  return <LandingPage data={data} />;
}
