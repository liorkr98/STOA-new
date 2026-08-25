"use client";

import { useState } from "react";
import { VideoRung } from "@/components/compose/video-rung";
import { StudioEditor } from "@/components/editor/studio-editor";
import { TagPicker, EMPTY_TAGS, type TagSelection } from "@/components/compose/tag-picker";
import { ProcessingState } from "@/components/compose/processing-state";
import { PublicationsView, type Publication } from "@/components/studio/publications-view";
import type { VideoEdit } from "@/lib/compose/overlays";

/**
 * Dev-only Compose fixture: the video rung with sample overlays (one text,
 * one full-frame cutaway, one inset), the tag picker with an auto-filled
 * primary, the post-publish processing state, and how a processing
 * publication reads in the Publications list. No real video: the stage runs
 * a 90-second clock over a poster.
 */

const SAMPLE: VideoEdit = {
  durationSeconds: 90,
  trimStart: 1.5,
  trimEnd: 86,
  thumbnail: { type: "frame", time: 5.6 },
  overlays: [
    { id: "t1", kind: "text", start: 2, end: 8, text: "Blackwell demand into January", position: 8, size: "md" },
    { id: "v1", kind: "visual", start: 12, end: 24, source: { type: "card", cardId: null, label: "Price chart · entry & target" }, mode: "cutaway", position: 5 },
    { id: "t2", kind: "text", start: 14, end: 22, text: "Entry 118.40 · Target 142", position: 8, size: "sm" },
    { id: "v2", kind: "visual", start: 40, end: 52, source: { type: "chart", ticker: "NVDA" }, mode: "inset", position: 3 },
  ],
};

const PUBS: Publication[] = [
  {
    id: "p1",
    href: "/report/p1",
    editHref: "/studio/compose?id=p1",
    state: "published",
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
    stateLine: "VIDEO PROCESSING · STARTED 2 MINUTES AGO",
  },
  {
    id: "p2",
    href: "/report/p2",
    editHref: "/studio/compose?id=p2",
    state: "open",
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
  const [tags, setTags] = useState<TagSelection>(EMPTY_TAGS);
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Compose fixture</h1>
      <p className="mt-1 text-sm text-text-mute">The full compose screen with its fork, then the video rung, tags, the processing state, and the Publications list row.</p>

      <h2 className="t-eyebrow mt-10">The compose screen (as an analyst sees it)</h2>
      <p className="mb-3 mt-1 text-sm text-text-mute">The real editor, mounted here without a database. Saving and publishing will fail; everything else behaves as on /studio/compose.</p>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border">
        <StudioEditor analystReportPrice={null} initialDraft={null} aiCredits={0} plans={[]} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <VideoRung initial={SAMPLE} />
        </div>
        <aside className="flex flex-col gap-4">
          <TagPicker value={tags} onChange={setTags} hasCall callSector="Semiconductors" />
        </aside>
      </div>

      <h2 className="t-eyebrow mt-12">After publish</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <ProcessingState status="processing" startedAt={PROCESSING_STARTED_AT} reportHref="/report/p1" hasOverlays />
        <ProcessingState status="ready" startedAt={READY_STARTED_AT} reportHref="/report/p2" hasOverlays={false} />
      </div>

      <h2 className="t-eyebrow mt-12">In the Publications list</h2>
      <div className="mt-3">
        <PublicationsView pubs={PUBS} />
      </div>
    </div>
  );
}
