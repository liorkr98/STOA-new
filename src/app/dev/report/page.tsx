import { DevAppShell } from "../_app-shell";
import { ReportView, type ReportViewData } from "@/components/report/report-view";
import type { FeedCard, FeedComment } from "@/lib/feed/types";
import type { ReportEdit } from "@/lib/db/report-edits";

/**
 * Dev-only publication page: the real ReportView over a fictional thesis, so
 * every block the reader can meet is on one page: key figures, a pull quote,
 * a card the analyst placed in the text and cards set after it, a sealed card,
 * the EDITED marker, the discussion with the Author tag.
 *
 *   ?access=subscribers   the locked section (a members piece, signed out)
 *   ?access=paid          a paid piece that members may also open
 *   ?access=paid-only     a paid piece with no member route
 *   ?auth=1               the signed-in reader (the composer shows; posting
 *                         and likes need a real row, so they fail here)
 *   ?clip=none            a written piece with no clip
 *   ?ticker=none          no stance: the theme chip anchors instead
 *
 * The clip is a local demo file, played only on a press. No real analyst,
 * portrait or publication appears here.
 */

const EDGE: FeedCard = {
  kind: "edge",
  id: "card-edge",
  locked: false,
  street: [
    { text: "A two-quarter air-gap, like the last transition", ink: "plain" },
    { text: "FY revenue $118B", ink: "auto" },
  ],
  mine: [
    { text: "Under one quarter: pre-orders already cover it", ink: "plain" },
    { text: "FY revenue $127B", ink: "creator_est" },
  ],
};

const KILL: FeedCard = {
  kind: "kill_switch",
  id: "card-kill",
  locked: false,
  conditions: [
    { text: "Lead times fall back under eight weeks", ink: "plain" },
    { text: "Gross margin guide below 71%", ink: "creator_est" },
  ],
};

const STEEL: FeedCard = {
  kind: "steelman",
  id: "card-steel",
  locked: false,
  objection: "Pre-orders are double-ordering, and they unwind the moment supply loosens.",
  answer:
    "Cancellation terms tightened this cycle; a cancelled slot now forfeits the deposit, which is exactly what double-ordering cannot survive.",
};

const SEALED: FeedCard = { kind: "thesis", id: "card-sealed", locked: true, title: "", body: "" };

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const figure = (label: string, value: string, note = "") => ({
  type: "dataFigureNode",
  attrs: { label, value, note, source: "", sourceRef: null },
});

const BODY = JSON.stringify({
  type: "doc",
  content: [
    p(
      "Three quarters of channel commentary pointed at a supply-constrained ramp. The pre-order pattern now looks materially cleaner than the last cycle, and the gap between what the Street models and what the order book says has rarely been this wide.",
    ),
    figure("Pre-orders against the last cycle", "+38%", "+11 pts in a quarter"),
    figure("Lead time, weeks", "11", "-3 since June"),
    figure("Street FY estimate", "$4.10", "per share"),
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Why the market has not priced it" }] },
    p(
      "The consensus is still anchored on the last transition, when the air-gap between generations cost two quarters of revenue. That is the pattern the market is paying for. It is not the pattern the channel is showing.",
    ),
    { type: "blockquote", content: [p("The question is not whether demand is there. It is whether the multiple already reflects it.")] },
    p(
      "Look at the order book from the side of the people placing the orders. A hyperscaler that double-orders now forfeits a deposit it did not have to post last cycle, and three of the four largest buyers have said as much on their own calls.",
    ),
    { type: "cardNode", attrs: { cardId: "card-edge" } },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What would change the view" }] },
    p(
      "Two things, and both are observable before the next print. If lead times fall back under eight weeks, the constraint that makes this interesting has gone. If the margin guide slips, the mix is not what the channel says it is.",
    ),
  ],
});

const EDITS: ReportEdit[] = [
  {
    id: "edit-1",
    editedAt: "2026-09-18T09:12:00Z",
    sections: ["headline", "thesis"],
    titleBefore: "Rubin pre-orders are filling",
    titleAfter: "Rubin pre-orders are quietly filling.",
    dekBefore: null,
    dekAfter: null,
  },
];

const COMMENTS: FeedComment[] = [
  {
    id: "c1",
    parentId: null,
    author: { handle: "dana_ellis", displayName: "Dana Ellis", avatarUrl: null, isAuthor: false },
    createdAt: "2026-09-18T12:00:00Z",
    text: "How much of this is already in the buy side's numbers?",
    likes: 12,
  },
  {
    id: "c2",
    parentId: "c1",
    author: { handle: "lena_k", displayName: "Lena Kowalczyk", avatarUrl: null, isAuthor: true },
    createdAt: "2026-09-18T13:30:00Z",
    text: "Less than you would think: the sell-side models still carry the old air-gap.",
    likes: 31,
  },
];

export default async function DevReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const access = sp.access === "subscribers" ? "subscribers" : sp.access?.startsWith("paid") ? "paid" : "free";
  const isAuthed = sp.auth === "1";
  const noTicker = sp.ticker === "none";
  const gated = access !== "free";

  const data: ReportViewData = {
    id: "00000000-0000-4000-8000-00000000d0c5",
    archived: false,
    isAuthor: false,
    isAuthed,
    headline: noTicker ? "Crude has stopped listening to the headlines." : "Rubin pre-orders are quietly filling.",
    dek: "Channel checks point to a cleaner air-gap than the last cycle, and the order book is already telling on itself.",
    typeLabel: "Thesis",
    publishedAt: "2026-09-17T08:00:00Z",
    views: 12840,
    likes: 214,
    liked: false,
    saved: false,
    author: { id: "fixture-analyst", handle: "lena_k", displayName: "Lena Kowalczyk", avatarUrl: null, verified: true },
    following: false,
    ticker: noTicker ? null : "NVDA",
    stance: noTicker ? null : "long",
    theme: noTicker ? "Oil & energy" : null,
    edits: EDITS,
    readMinutes: 6,
    clip:
      sp.clip === "none"
        ? null
        : {
            reportId: "fixture",
            clipId: null,
            embedUrl: null,
            playbackUrl: "/demo/clips/clip-01.mp4",
            thumbnailUrl: "/demo/clips/clip-01.jpg",
            analystId: "fixture-analyst",
            durationSeconds: 71,
            analystName: "Lena Kowalczyk",
            edit: null,
            ticker: noTicker ? null : "NVDA",
          },
    pendingClip: null,
    canRead: !gated,
    body: gated ? null : BODY,
    claims: [],
    cards: gated ? [KILL, SEALED] : [EDGE, KILL, STEEL, SEALED],
    gate: gated
      ? {
          reportId: "fixture",
          access,
          membersIncluded: sp.access === "paid",
          price: 9,
          subPrice: 12,
          balance: 0,
          isAuthed,
          subscribed: false,
          authorId: "fixture-analyst",
          authorHandle: "lena_k",
          authorName: "Lena Kowalczyk",
          minutesLeft: 5,
        }
      : null,
    disclosure: { holdsPosition: true, compensationTied: false },
    discussion: COMMENTS,
    fixture: true,
  };

  return (
    <DevAppShell>
      <ReportView data={data} />
    </DevAppShell>
  );
}
