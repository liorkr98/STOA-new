import type { FeedCard, FeedComment, FeedPublication } from "@/lib/feed/types";
import type { AttentionSample } from "@/lib/lifecycle/stages";

/**
 * Dev-only fixtures for the Feed player and the Explore wall. Fictional
 * analysts with no photos, hatched posters instead of thumbnails, fake
 * durations, invented card content. Only ever imported from /dev routes.
 */

const NOW = Date.parse("2026-08-18T14:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

type A = FeedPublication["analyst"];
const LENA: A = { handle: "lenakw", displayName: "Lena Kowalczyk", avatarUrl: null };
const KAI: A = { handle: "kaitanaka", displayName: "Kai Tanaka", avatarUrl: null };
const MARCUS: A = { handle: "marcus_webb", displayName: "Marcus Webb", avatarUrl: null };
const PRIYA: A = { handle: "priyanadar", displayName: "Priya Nadar", avatarUrl: null };
const NOOR: A = { handle: "noorhaddad", displayName: "Noor Haddad", avatarUrl: null };
const DANA: A = { handle: "danafixture", displayName: "Dana Fixture", avatarUrl: null };
const OMAR: A = { handle: "omarfixture", displayName: "Omar Fixture", avatarUrl: null };
const IRIS: A = { handle: "irisfixture", displayName: "Iris Fixture", avatarUrl: null };

function fullStack(id: string, ticker: string, locked: boolean[]): FeedCard[] {
  const l = (i: number) => Boolean(locked[i]);
  return [
    { kind: "thesis", id: `${id}-c0`, locked: l(0), title: `The case for ${ticker}`, body: "Consensus is modelling a normal cycle. The supply data says this one is not normal, and the customers with the least price sensitivity are the ones buying." },
    { kind: "edge", id: `${id}-c1`, locked: l(1), street: [{ text: "Units grow 12% next year", ink: "auto" }, { text: "Gross margin flat at 58%", ink: "auto" }], mine: [{ text: "Units grow 22%", ink: "creator_est" }, { text: "Gross margin 61% on mix", ink: "creator_est" }] },
    { kind: "path_to_target", id: `${id}-c2`, locked: l(2), steps: [{ label: "FY27 EPS", value: { text: "$5.40", ink: "creator_est" } }, { label: "Multiple", value: { text: "24x", ink: "creator_est" } }, { label: "Street EPS", value: { text: "$4.60", ink: "auto" } }], result: { text: "$130", ink: "creator_est" } },
    { kind: "kill_switch", id: `${id}-c3`, locked: l(3), conditions: [{ text: "Lead times fall below 20 weeks", ink: "auto" }, { text: "The largest customer guides capex down", ink: "plain" }] },
    { kind: "catalyst_timeline", id: `${id}-c4`, locked: l(4), events: [{ dateISO: hoursAgo(24 * 20), label: "Q2 print", past: true }, { dateISO: hoursAgo(-24 * 30), label: "Analyst day", past: false }, { dateISO: hoursAgo(-24 * 75), label: "Q3 print", past: false }] },
    { kind: "checklist", id: `${id}-c5`, locked: l(5), rows: [{ label: "Backlog growing", status: "done", ink: "auto" }, { label: "Pricing holding", status: "done", ink: "creator_est" }, { label: "Inventory days falling", status: "pending", ink: "auto" }, { label: "Insider buying", status: "failed", ink: "auto" }] },
    { kind: "figure", id: `${id}-c6`, locked: l(6), caption: "Lead times vs price, trailing 8 quarters", imageUrl: null, source: "creator" },
    { kind: "steelman", id: `${id}-c7`, locked: l(7), objection: "Capacity additions announced this year land in exactly the window your target needs supply to stay tight.", answer: "They land, but they land at trailing-edge nodes. The tightness is at the leading edge, where the announced capacity is a rounding error until 2028." },
    { kind: "unlock", id: `${id}-unlock`, locked: false, access: "subscribers", price: null },
  ];
}

function noteStack(id: string): FeedCard[] {
  return [
    { kind: "thesis", id: `${id}-c0`, locked: false, title: "What this note covers", body: "A short read on a headline that will move the tape today. No call, no target, just context." },
    { kind: "unlock", id: `${id}-unlock`, locked: false, access: "free", price: null },
  ];
}

const comments = (id: string, author: A): FeedComment[] => [
  { id: `${id}-m1`, parentId: null, author: { handle: "reader_one", displayName: "Reader One", avatarUrl: null, isAuthor: false }, createdAt: hoursAgo(3), text: "How does the target hold up if the largest customer pushes its capex into next year?", likes: 12 },
  { id: `${id}-m2`, parentId: `${id}-m1`, author: { ...author, isAuthor: true }, createdAt: hoursAgo(2), text: "It slides a quarter, it does not break. The kill switch is lead times, not the calendar.", likes: 31 },
  { id: `${id}-m3`, parentId: `${id}-m1`, author: { handle: "reader_two", displayName: "Reader Two", avatarUrl: null, isAuthor: false }, createdAt: hoursAgo(1), text: "That is the answer I was hoping for.", likes: 4, replyingTo: author.displayName },
  { id: `${id}-m4`, parentId: null, author: { handle: "reader_three", displayName: "Reader Three", avatarUrl: null, isAuthor: false }, createdAt: hoursAgo(6), text: "Sharp on the mix point. The Street keeps missing it.", likes: 7 },
];

interface Spec {
  id: string;
  by: A;
  type: FeedPublication["typeLabel"];
  headline: string;
  deck?: string;
  ticker?: string;
  dir?: "long" | "short";
  sector?: string;
  theme?: string;
  secs: number;
  hours: number;
  views: number;
  seal?: FeedPublication["seal"];
  locked?: boolean[];
  access?: FeedPublication["access"];
}

const SPECS: Spec[] = [
  { id: "x1", by: LENA, type: "CALL", headline: "Blackwell demand is still under-modelled into the January quarter", deck: "Hyperscaler capex guides imply a supply-constrained first half.", ticker: "NVDA", dir: "long", sector: "Semiconductors", secs: 222, hours: 2, views: 4820, locked: [false, false, true, true, true, true, true, true], access: "subscribers" },
  { id: "x2", by: KAI, type: "CALL", headline: "The refiners nobody is modelling correctly", deck: "Crack spreads held through a quarter that should have crushed them.", ticker: "VLO", dir: "long", sector: "Energy", secs: 187, hours: 4, views: 3100 },
  { id: "x3", by: PRIYA, type: "NOTE", headline: "What the Strait of Hormuz headlines mean for crude this week", theme: "MACRO · OIL & ENERGY", sector: "Energy", secs: 95, hours: 5, views: 2210 },
  { id: "x4", by: MARCUS, type: "CALL", headline: "Shorting the last honest regional bank", ticker: "ZION", dir: "short", sector: "Financials", secs: 240, hours: 7, views: 1900, locked: [false, true, true, true, true, true, true, true], access: "paid" },
  { id: "x5", by: NOOR, type: "CALL", headline: "Copper is the only clean energy trade left", ticker: "FCX", dir: "long", sector: "Materials", secs: 140, hours: 6, views: 2600 },
  { id: "x6", by: DANA, type: "CALL", headline: "Micron: HBM pricing holds through the cycle", ticker: "MU", dir: "long", sector: "Semiconductors", secs: 187, hours: 9, views: 5610, seal: { status: "hit", dateISO: hoursAgo(30) } },
  { id: "x7", by: KAI, type: "NOTE", headline: "A note on the yen carry unwind", theme: "MACRO · RATES", secs: 71, hours: 10, views: 800 },
  { id: "x8", by: MARCUS, type: "RESEARCH", headline: "Insurance float is quietly repricing", ticker: "CB", dir: "long", sector: "Financials", secs: 260, hours: 12, views: 1200 },
  { id: "x9", by: PRIYA, type: "CALL", headline: "Semis are not one trade anymore", ticker: "SMH", dir: "long", sector: "Semiconductors", secs: 200, hours: 14, views: 3300 },
  { id: "x10", by: LENA, type: "CALL", headline: "AMD's MI350 window is narrower than the bulls think", ticker: "AMD", dir: "short", sector: "Semiconductors", secs: 301, hours: 20, views: 3910, seal: { status: "near", dateISO: hoursAgo(50) } },
  { id: "x11", by: NOOR, type: "RESEARCH", headline: "Grid capex is the decade's quietest compounder", ticker: "ETN", dir: "long", sector: "Industrials", secs: 220, hours: 22, views: 1400 },
  { id: "x12", by: DANA, type: "NOTE", headline: "Reading the SOX breadth chart", theme: "SEMIS", sector: "Semiconductors", secs: 60, hours: 26, views: 640 },
  { id: "x13", by: OMAR, type: "CALL", headline: "Valero into the turnaround season", ticker: "VLO", dir: "long", sector: "Energy", secs: 150, hours: 30, views: 900 },
  { id: "x14", by: IRIS, type: "CALL", headline: "Zions: the deposit beta problem", ticker: "ZION", dir: "short", sector: "Financials", secs: 130, hours: 33, views: 700 },
  { id: "x15", by: PRIYA, type: "RESEARCH", headline: "ASML after the bookings trough", ticker: "ASML", dir: "long", sector: "Semiconductors", secs: 280, hours: 40, views: 2980, seal: { status: "miss", dateISO: hoursAgo(80) } },
  { id: "x16", by: LENA, type: "CALL", headline: "TSMC's N2 ramp is the capex the market is not pricing", ticker: "TSM", dir: "long", sector: "Semiconductors", secs: 240, hours: 44, views: 1330 },
  { id: "x17", by: OMAR, type: "CALL", headline: "Exxon: supply discipline holds through the summer", ticker: "XOM", dir: "long", sector: "Energy", secs: 175, hours: 50, views: 1100 },
  { id: "x18", by: IRIS, type: "NOTE", headline: "Why the semis rally is broader than the Magnificent Seven", theme: "SEMIS", sector: "Semiconductors", secs: 88, hours: 52, views: 980 },
  { id: "x19", by: KAI, type: "CALL", headline: "Cheniere and the LNG contract cliff", ticker: "LNG", dir: "long", sector: "Energy", secs: 210, hours: 60, views: 640 },
  { id: "x20", by: MARCUS, type: "CALL", headline: "Regional banks: the next shoe", ticker: "KRE", dir: "short", sector: "Financials", secs: 95, hours: 66, views: 1500 },
  { id: "x21", by: NOOR, type: "CALL", headline: "Freeport at the top of the copper curve", ticker: "FCX", dir: "long", sector: "Materials", secs: 130, hours: 70, views: 1250 },
  { id: "x22", by: DANA, type: "CALL", headline: "Lam Research: the etch intensity story", ticker: "LRCX", dir: "long", sector: "Semiconductors", secs: 190, hours: 80, views: 700 },
  { id: "x23", by: OMAR, type: "RESEARCH", headline: "Linde and the industrial gas moat", ticker: "LIN", dir: "long", sector: "Materials", secs: 250, hours: 90, views: 560 },
  { id: "x24", by: IRIS, type: "CALL", headline: "Arm's royalty mix is where the models break", ticker: "ARM", dir: "long", sector: "Semiconductors", secs: 180, hours: 100, views: 2200 },
  { id: "x25", by: PRIYA, type: "NOTE", headline: "Three charts on the dollar", theme: "MACRO · FX", secs: 75, hours: 110, views: 420 },
  { id: "x26", by: LENA, type: "CALL", headline: "Broadcom's custom silicon runway", ticker: "AVGO", dir: "long", sector: "Semiconductors", secs: 200, hours: 120, views: 1800 },
  { id: "x27", by: KAI, type: "CALL", headline: "Chevron's Permian math", ticker: "CVX", dir: "long", sector: "Energy", secs: 160, hours: 130, views: 900 },
  { id: "x28", by: MARCUS, type: "CALL", headline: "Chubb: pricing power in a hard market", ticker: "CB", dir: "long", sector: "Financials", secs: 140, hours: 140, views: 780 },
  { id: "x29", by: NOOR, type: "CALL", headline: "Eaton: the transformer shortage is a decade long", ticker: "ETN", dir: "long", sector: "Industrials", secs: 210, hours: 150, views: 1650 },
  { id: "x30", by: DANA, type: "CALL", headline: "Applied Materials into the ramp", ticker: "AMAT", dir: "long", sector: "Semiconductors", secs: 170, hours: 160, views: 620 },
];

export function fixturePublications(): FeedPublication[] {
  return SPECS.map((s) => {
    const hasCall = Boolean(s.ticker);
    const badge = ["VIDEO", hasCall ? "CALL" : null, s.type === "RESEARCH" ? "THESIS" : null].filter(Boolean).join(" · ");
    return {
      id: s.id,
      clipId: `clip-${s.id}`,
      embedUrl: null,
      thumbnailUrl: null,
      durationSeconds: s.secs,
      headline: s.headline,
      deck: s.deck ?? null,
      typeLabel: s.type,
      ticker: s.ticker ?? null,
      direction: s.dir ?? null,
      themeTag: s.theme ?? null,
      sector: s.sector ?? null,
      contentBadge: badge,
      stageMarker: s.hours < 12 && s.views > 2000 ? "TRENDING" : s.by === DANA || s.by === IRIS ? "NEW" : null,
      analyst: s.by,
      seal: s.seal ?? null,
      access: s.access ?? "free",
      price: s.access === "paid" ? 7 : null,
      cards: hasCall ? fullStack(s.id, s.ticker!, s.locked ?? []) : noteStack(s.id),
      comments: comments(s.id, s.by),
      publishedAt: hoursAgo(s.hours),
    };
  });
}

/** Attention samples for the fixture, so trending ranks the way it would live. */
export function fixtureSample(p: FeedPublication): AttentionSample {
  const spec = SPECS.find((s) => s.id === p.id);
  return { since: p.publishedAt, total: spec?.views ?? 0 };
}
