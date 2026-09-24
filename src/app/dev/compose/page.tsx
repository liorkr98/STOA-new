"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StudioEditor } from "@/components/editor/studio-editor";
import { ProcessingState } from "@/components/compose/processing-state";
import { ComposePicker, type PickerDraft } from "@/components/compose/type-picker";
import { summarizeDraft } from "@/lib/compose/drafts";
import { PublicationsView, type Publication } from "@/components/studio/publications-view";
import type { DraftCard } from "@/lib/compose/cards";
import type { Report } from "@/lib/types";
import { DevPrivateShell } from "../_private-shell";
import { devRefreshRoute } from "../actions";

/**
 * Dev-only Compose fixture: the type picker, then the workspace on a draft
 * of each type, so the spine, the features menu and the card placements can
 * be reviewed without a database. Saving and publishing fail here; everything
 * else behaves as on /studio/compose.
 *
 * The workspace is mounted inside a copy of the (private) app shell (see
 * ../_private-shell), because Compose measures its frame off the scroller.
 */


const CARDS: DraftCard[] = [
  {
    id: "c_thesis",
    kind: "thesis",
    locked: false,
    payload: {
      title: "Blackwell demand is under-modelled",
      body: "January quarter guidance assumes a supply ceiling that has already moved. The street is modelling the old one.",
    },
  },
  {
    id: "c_edge",
    kind: "edge",
    locked: false,
    payload: {
      street: [
        { text: "Consensus revenue $37.1B", ink: "auto" },
        { text: "Gross margin 73%", ink: "auto" },
      ],
      mine: [
        { text: "Revenue $39.4B", ink: "creator_est" },
        { text: "Margin holds at 74.5%", ink: "creator_est" },
      ],
    },
  },
  {
    id: "c_path",
    kind: "path_to_target",
    locked: true,
    payload: {
      steps: [
        { label: "Units shipped", value: { text: "+18%", ink: "creator_est" } },
        { label: "ASP", value: { text: "$41,200", ink: "auto" } },
      ],
      result: { text: "$142 target", ink: "creator_est" },
    },
  },
  {
    id: "c_kill",
    kind: "kill_switch",
    locked: false,
    payload: {
      conditions: [
        { text: "Hyperscaler capex guided down two quarters running", ink: "plain" },
        { text: "Lead times below 12 weeks", ink: "creator_est" },
      ],
    },
  },
];

const BODY = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The supply ceiling everyone is modelling was set before the packaging capacity came online. That is the whole disagreement, and it is measurable.",
        },
      ],
    },
    { type: "cardNode", attrs: { cardId: "c_edge" } },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "On our numbers the January quarter clears consensus on both lines, and the margin question resolves itself a quarter later.",
        },
      ],
    },
  ],
});

type Shape = "pick" | "video" | "brief" | "thesis" | "stance" | "published";

function parseShape(raw: string | null): Shape {
  if (
    raw === "pick" ||
    raw === "video" ||
    raw === "brief" ||
    raw === "thesis" ||
    raw === "stance" ||
    raw === "published"
  ) {
    return raw;
  }
  return "pick";
}

/** The picker's drafts: one per type, at different points along the spine. */
const PICKER_DRAFTS: PickerDraft[] = (
  [
    {
      id: "fx-stance",
      type: "short_post",
      title: "Photronics guided flat and the mix says otherwise",
      summary: null,
      body: null,
      ticker: "PLAB",
      primary_tag: null,
      created_at: "2026-09-10T09:00:00Z",
      updated_at: "2026-09-14T15:00:00Z",
      stance: "short",
      editedLabel: "2 days ago",
    },
    {
      id: "fx-thesis",
      type: "research",
      title: "AXT's indium phosphide ramp is mispriced by two years",
      summary: null,
      body: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The ramp."}]}]}',
      ticker: "AXTI",
      primary_tag: null,
      created_at: "2026-09-01T09:00:00Z",
      updated_at: "2026-09-09T15:00:00Z",
      editedLabel: "7 days ago",
    },
    {
      id: "fx-video",
      type: "video",
      title: "Why the qualification matters",
      summary: null,
      body: null,
      ticker: "AXTI",
      primary_tag: "semiconductors",
      created_at: "2026-08-30T09:00:00Z",
      updated_at: "2026-08-30T15:00:00Z",
      editedLabel: "17 days ago",
    },
    {
      id: "fx-brief",
      type: "short_post",
      title: null,
      summary: "Two lines on the print.",
      body: null,
      ticker: null,
      primary_tag: null,
      created_at: "2026-08-28T09:00:00Z",
      updated_at: "2026-08-28T15:00:00Z",
      editedLabel: "19 days ago",
    },
  ] as const
).map(({ editedLabel, ...row }) => ({ ...summarizeDraft(row), editedLabel }));

const SHAPES: { key: Shape; label: string; blurb: string }[] = [
  { key: "pick", label: "Type picker", blurb: "The first screen, with four drafts" },
  { key: "video", label: "Video", blurb: "A new video: the spine from its first step" },
  { key: "brief", label: "Brief", blurb: "A brief with its take written, no headline yet" },
  { key: "thesis", label: "Thesis", blurb: "A thesis with words and a headline, no tags yet" },
  { key: "stance", label: "Stance", blurb: "A thesis draft carrying a stance, NVDA long" },
  { key: "published", label: "Published, editing", blurb: "A live piece with a real clip and a stance, reopened" },
];

/** One draft per type, each stopped at a different point along its spine. */
function draftFor(shape: Shape): Report | null {
  switch (shape) {
    case "video":
      return null;
    case "brief":
      return {
        id: "dev-brief",
        type: "short_post",
        status: "draft",
        summary: "The supply ceiling moved. Consensus is still modelling the old one.",
        access: "free",
      } as unknown as Report;
    case "thesis":
      return {
        id: "dev-thesis",
        type: "research",
        status: "draft",
        title: "Blackwell demand is still under-modelled into the January quarter",
        summary: "The supply ceiling moved. Consensus is still modelling the old one.",
        body: BODY,
        access: "free",
      } as unknown as Report;
    case "stance":
      return {
        id: "dev-stance",
        type: "research",
        status: "draft",
        title: "Blackwell demand is still under-modelled into the January quarter",
        body: BODY,
        ticker: "NVDA",
        stance: "long",
        access: "free",
      } as unknown as Report;
    default:
      return {
        id: "dev-published",
        type: "video",
        status: "published",
        title: "Blackwell demand is still under-modelled into the January quarter",
        summary: "The supply ceiling moved. Consensus is still modelling the old one.",
        body: BODY,
        access: "paid",
        price: 9,
        ticker: "NVDA",
        stance: "long",
        primary_tag: "semiconductors",
        secondary_tags: ["ai-infrastructure"],
        locked_at: "2026-08-18T14:00:00.000Z",
        published_at: "2026-08-18T14:00:00.000Z",
      } as unknown as Report;
  }
}

const PUBS: Publication[] = [
  {
    id: "p1",
    href: "/report/p1",
    editHref: "/studio/compose?id=p1",
    state: "published",
    deletable: true,
    typeLabel: "THESIS",
    tag: "NVDA",
    tagIsTicker: true,
    badge: "THESIS",
    title: "Blackwell demand is still under-modelled into the January quarter",
    duration: "",
    videoStatus: "processing",
    dateLabel: "AUG 18",
    views: "0",
    plays: "0",
    pinned: false,
    editedAt: "2026-08-29T14:32:00.000Z",
    stateLine: "VIDEO PROCESSING · STARTED 2 MINUTES AGO",
  },
  {
    id: "p2",
    href: "/report/p2",
    editHref: "/studio/compose?id=p2",
    state: "published",
    deletable: false,
    typeLabel: "THESIS",
    tag: "MU",
    tagIsTicker: true,
    badge: "VIDEO",
    title: "Micron: HBM pricing holds through the cycle",
    duration: "3:07",
    videoStatus: "ready",
    dateLabel: "AUG 12",
    views: "5.6K",
    plays: "3.1K",
    pinned: true,
    stateLine: null,
    direction: "long",
  },
];

// Fixed at module load: these are demo timestamps, and reading the clock during
// render makes this page re-render impure.
const PROCESSING_STARTED_AT = new Date(Date.now() - 2 * 60_000).toISOString();
const READY_STARTED_AT = new Date(Date.now() - 9 * 60_000).toISOString();
/** The most-used tags, as the live page reads them off published work. */
const POPULAR_TAGS = ["semiconductors", "ai-buildout", "energy", "financials", "memory", "software"];

export default function DevComposePage() {
  return (
    <Suspense fallback={<div className="h-[var(--app-h)] bg-bg" />}>
      <DevComposeInner />
    </Suspense>
  );
}

function DevComposeInner() {
  const search = useSearchParams();
  const [shape, setShape] = useState<Shape>(() => parseShape(search.get("shape")));

  return (
    <div className="w-full">
      <DevPrivateShell>
        <div className="breakout-main">
          {shape === "pick" ? (
            <ComposePicker drafts={PICKER_DRAFTS} />
          ) : (
          <StudioEditor
            key={shape}
            analystReportPrice={null}
            initialType={shape === "published" ? "video" : shape === "stance" ? "thesis" : shape}
            initialDraft={draftFor(shape)}
            initialCards={shape === "thesis" || shape === "published" ? CARDS : []}
            hasVideoClip={shape === "published"}
            aiCredits={40}
            plans={[]}
            editingPublished={shape === "published"}
            popularTags={POPULAR_TAGS}
          />
          )}
        </div>
      </DevPrivateShell>

      {/* The fixture's own controls sit under the shell rather than above it,
          so the shell fills the window exactly as the real page does. */}
      <div className="mx-auto w-full max-w-6xl px-5 pt-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Compose fixture</h1>
        <p className="mt-1 text-sm text-text-mute">
          The workspace above, on each draft shape. Left is what you build with, right is what you publish as.
        </p>

        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Draft shape">
          {SHAPES.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={shape === s.key}
              onClick={() => {
                setShape(s.key);
                window.scrollTo({ top: 0 });
              }}
              className={
                shape === s.key
                  ? "focus-ring rounded-[var(--radius-btn)] border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-left text-[0.8125rem] text-[var(--paper)]"
                  : "focus-ring rounded-[var(--radius-btn)] border border-border px-3 py-1.5 text-left text-[0.8125rem] text-text-mute hover:text-text"
              }
            >
              <span className="block font-medium">{s.label}</span>
              <span className="block text-[0.75rem] opacity-80">{s.blurb}</span>
            </button>
          ))}
          <Link
            href="/dev/compose"
            className="num focus-ring self-center rounded text-[10px] uppercase tracking-[0.14em] text-text-faint hover:text-text"
          >
            Reload
          </Link>
          {/* A real save revalidates paths, and the router refreshes the
              route in response. The fixture cannot save, so this presses the
              same refresh on its own: walk to a step, press it, and the step
              must still be there. */}
          <button
            type="button"
            onClick={() => void devRefreshRoute()}
            className="num focus-ring self-center rounded border border-dashed border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-text-faint hover:text-text"
          >
            Simulate a save refresh
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5">
        <h2 className="t-eyebrow mt-12">After publish</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <ProcessingState status="processing" startedAt={PROCESSING_STARTED_AT} reportHref="/report/p1" hasOverlays />
          <ProcessingState status="ready" startedAt={READY_STARTED_AT} reportHref="/report/p2" hasOverlays={false} />
        </div>

        <h2 className="t-eyebrow mt-12">In the Publications list</h2>
        <p className="mt-1 text-sm text-text-mute">Promote is reachable here, on a publication that is already out.</p>
        <div className="mt-3">
          <PublicationsView pubs={PUBS} />
        </div>
      </div>
    </div>
  );
}
