"use client";

import { DevPrivateShell } from "@/app/dev/_private-shell";
import { PublicationsView, type Publication } from "@/components/studio/publications-view";

/**
 * Dev-only Publications list: one row in every state a creator's list can
 * hold, so the per-row actions can be reviewed without a session. A draft
 * offers Delete and not Promote or Archive; a published piece with no stance
 * offers both Archive and Delete; a piece with a stance offers Archive only. The
 * actions call the real server actions, which fail here without a session.
 */

function row(over: Partial<Publication> & Pick<Publication, "id" | "state" | "title">): Publication {
  return {
    href: `/report/${over.id}`,
    editHref: `/studio/compose?id=${over.id}`,
    typeLabel: "THESIS",
    tag: null,
    tagIsTicker: false,
    badge: "THESIS",
    duration: "",
    videoStatus: null,
    dateLabel: "SEP 6, 2026",
    views: "0",
    plays: over.duration ? "0" : null,
    pinned: false,
    stateLine: null,
    deletable: true,
    ...over,
  };
}

const PUBS: Publication[] = [
  row({ id: "fx-draft", state: "draft", title: "A draft nobody has seen yet", stateLine: "DRAFT · EDITED 2H AGO" }),
  row({
    id: "fx-stance",
    state: "published",
    title: "NVDA earns its multiple into the January quarter",
    deletable: false,
    direction: "long",
    typeLabel: "VIDEO",
    tag: "NVDA",
    tagIsTicker: true,
    badge: "VIDEO · CARDS",
    duration: "1:12",
    videoStatus: "ready",
    views: "1.2k",
    plays: "840",
  }),
  row({
    id: "fx-note",
    state: "published",
    title: "What the Iran escalation means for crude",
    typeLabel: "BRIEF",
    tag: "Oil & Energy",
    badge: "VIDEO · NOTE",
    duration: "0:48",
    videoStatus: "ready",
    views: "640",
    plays: "410",
  }),
  row({ id: "fx-archived", state: "archived", title: "An archived note", typeLabel: "BRIEF" }),
];

export default function DevStudioPage() {
  return (
    <DevPrivateShell>
      <div className="mx-auto w-full max-w-[var(--w-standard)]">
        <PublicationsView pubs={PUBS} />
      </div>
    </DevPrivateShell>
  );
}
