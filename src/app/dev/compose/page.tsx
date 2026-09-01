"use client";

import { useState } from "react";
import Link from "next/link";
import { StudioEditor } from "@/components/editor/studio-editor";
import { ProcessingState } from "@/components/compose/processing-state";
import { PublicationsView, type Publication } from "@/components/studio/publications-view";
import type { DraftCard } from "@/lib/compose/cards";
import type { Report } from "@/lib/types";

/**
 * Dev-only Compose fixture: the workspace on each of the three draft shapes
 * a creator can open, so the rails, the modules and the card placements can
 * be reviewed without a database. Saving and publishing fail here; everything
 * else behaves as on /studio/compose.
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

type Shape = "video" | "research" | "both";

const SHAPES: { key: Shape; label: string; blurb: string }[] = [
  { key: "video", label: "Video only", blurb: "A clip, no written report" },
  { key: "research", label: "Research only", blurb: "Written work, no clip" },
  { key: "both", label: "Video and research", blurb: "Both modules present" },
];

function draftFor(shape: Shape): Report {
  return {
    id: `dev-${shape}`,
    type: "call",
    title: "Blackwell demand is still under-modelled into the January quarter",
    summary: "The supply ceiling moved. Consensus is still modelling the old one.",
    body: shape === "video" ? null : BODY,
    access: "free",
    ticker: "NVDA",
    primary_tag: "semiconductors",
    secondary_tags: ["ai-infrastructure"],
  } as unknown as Report;
}

const PUBS: Publication[] = [
  {
    id: "p1",
    href: "/report/p1",
    editHref: "/studio/compose?id=p1",
    state: "published",
    hasCall: false,
    typeLabel: "CALL",
    tag: "NVDA",
    tagIsTicker: true,
    badge: "CALL · THESIS",
    title: "Blackwell demand is still under-modelled into the January quarter",
    duration: "",
    videoStatus: "processing",
    dateLabel: "AUG 18",
    views: "0",
    unlocks: "—",
    revenue: "—",
    pinned: false,
    editedAt: "2026-08-29T14:32:00.000Z",
    stateLine: "VIDEO PROCESSING · STARTED 2 MINUTES AGO",
  },
  {
    id: "p2",
    href: "/report/p2",
    editHref: "/studio/compose?id=p2",
    state: "open",
    hasCall: true,
    typeLabel: "CALL",
    tag: "MU",
    tagIsTicker: true,
    badge: "VIDEO · CALL",
    title: "Micron: HBM pricing holds through the cycle",
    duration: "3:07",
    videoStatus: "ready",
    dateLabel: "AUG 12",
    views: "5.6K",
    unlocks: "—",
    revenue: "—",
    pinned: true,
    stateLine: "OPEN · RESOLVES IN 41 DAYS",
    entry: "96.20",
    target: "121.70",
    progressPct: 40,
    direction: "long",
  },
];

// Fixed at module load: these are demo timestamps, and reading the clock during
// render makes this page re-render impure.
const PROCESSING_STARTED_AT = new Date(Date.now() - 2 * 60_000).toISOString();
const READY_STARTED_AT = new Date(Date.now() - 9 * 60_000).toISOString();

export default function DevComposePage() {
  const [shape, setShape] = useState<Shape>("both");

  return (
    <div className="w-full py-6">
      <div className="mx-auto w-full max-w-6xl px-5">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Compose fixture</h1>
        <p className="mt-1 text-sm text-text-mute">
          The workspace on each draft shape. Left is what you build with, right is what you publish as.
        </p>

        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Draft shape">
          {SHAPES.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={shape === s.key}
              onClick={() => setShape(s.key)}
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
        </div>
      </div>

      <div className="mt-6 border-y border-border">
        <StudioEditor
          key={shape}
          analystReportPrice={null}
          initialDraft={draftFor(shape)}
          initialCards={CARDS}
          hasVideoClip={shape !== "research"}
          aiCredits={40}
          plans={[]}
        />
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
