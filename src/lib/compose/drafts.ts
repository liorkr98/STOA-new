/**
 * What a draft looks like from the type picker: its type, its headline, when
 * it was last touched, and how far along its spine it is.
 *
 * Progress is derived from what is stored, never recorded, so it cannot
 * drift. Every type walks the same three steps (the content, the headline,
 * the tags) and a draft opens at the first one it has not finished.
 */

import { isTiptapDoc, parseTiptapDoc, tiptapPlainText } from "@/lib/editor/tiptap/serialize";
import { publicationTypeDef, publicationTypeFrom, type PublicationType } from "@/lib/compose/modes";
import type { ContentType, Direction } from "@/lib/types";

/** The columns the picker needs. `body` is the stored report body, if any. */
export interface DraftRow {
  id: string;
  type: ContentType;
  title: string | null;
  summary: string | null;
  body: string | null;
  ticker: string | null;
  primary_tag: string | null;
  created_at: string;
  updated_at?: string | null;
  draft_direction?: Direction | null;
  draft_target_price?: number | null;
  draft_horizon_days?: number | null;
}

/** The spine's first step, by type. */
export type ContentStepKey = "video" | "brief" | "thesis" | "call";

export function contentStepFor(type: PublicationType): ContentStepKey {
  switch (type) {
    case "video":
      return "video";
    case "brief":
      return "brief";
    case "thesis":
      return "thesis";
    case "verdict":
      return "call";
  }
}

export interface SpineFacts {
  hasContent: boolean;
  hasTitle: boolean;
  hasTags: boolean;
}

export const SPINE_LENGTH = 3;

/** Steps done, in spine order, and the first one still open. */
export function spineProgress(f: SpineFacts): {
  done: number;
  total: number;
  /** 0 content, 1 headline, 2 tags, 3 when every step is done. */
  resumeAt: 0 | 1 | 2 | 3;
} {
  const done = Number(f.hasContent) + Number(f.hasTitle) + Number(f.hasTags);
  const resumeAt: 0 | 1 | 2 | 3 = !f.hasContent ? 0 : !f.hasTitle ? 1 : !f.hasTags ? 2 : 3;
  return { done, total: SPINE_LENGTH, resumeAt };
}

/** Whether a stored body holds any words. */
export function bodyHasWords(body: string | null | undefined): boolean {
  if (!body) return false;
  if (isTiptapDoc(body)) return tiptapPlainText(parseTiptapDoc(body)).trim().length > 0;
  return body.trim().length > 0;
}

/**
 * What a draft row holds, by its type's own rule for "content".
 *
 * A video draft never holds its clip between sessions: the file is held in
 * the tab until publish, because a clip row can only hang off a locked
 * report. So a reopened video draft always starts at the video step, and
 * that is said rather than hidden.
 */
export function draftFacts(row: DraftRow): SpineFacts & { type: PublicationType } {
  const type = publicationTypeFrom(row.type);
  let hasContent = false;
  switch (type) {
    case "video":
      hasContent = false;
      break;
    case "brief":
      hasContent = Boolean(row.summary?.trim());
      break;
    case "thesis":
      hasContent = bodyHasWords(row.body);
      break;
    case "verdict":
      hasContent = Boolean(
        row.ticker?.trim() &&
          row.draft_direction &&
          row.draft_target_price != null &&
          row.draft_target_price > 0 &&
          row.draft_horizon_days != null,
      );
      break;
  }
  return {
    type,
    hasContent,
    hasTitle: Boolean(row.title?.trim()),
    hasTags: Boolean(row.primary_tag),
  };
}

export interface DraftSummary {
  id: string;
  type: PublicationType;
  typeLabel: string;
  /** The headline, or a placeholder naming the type. */
  title: string;
  untitled: boolean;
  /** "PLAB", the ticker, when the draft has one. */
  ticker: string | null;
  /** One mono line: where it is along the spine, in the creator's terms. */
  where: string;
  done: number;
  total: number;
  /** 0 to 100. */
  percent: number;
  /** ISO time it was last saved. */
  touchedAt: string;
  href: string;
}

function whereLine(type: PublicationType, f: SpineFacts, row: DraftRow): string {
  const p = spineProgress(f);
  if (p.resumeAt === 3) return "Ready to publish";
  if (type === "thesis" && p.resumeAt === 0 && !f.hasContent) {
    return "Report not started";
  }
  if (type === "video" && p.resumeAt === 0) return "Needs the clip again";
  if (type === "verdict" && p.resumeAt === 0) {
    return row.ticker ? "Call half entered" : "No call yet";
  }
  if (type === "brief" && p.resumeAt === 0) return "Nothing written yet";
  return p.resumeAt === 1 ? "No headline" : "No tags";
}

export function summarizeDraft(row: DraftRow): DraftSummary {
  const facts = draftFacts(row);
  const p = spineProgress(facts);
  const def = publicationTypeDef(facts.type);
  const title = row.title?.trim() || "";
  return {
    id: row.id,
    type: facts.type,
    typeLabel: def.label.toUpperCase(),
    title: title || `Untitled ${def.label.toLowerCase()}`,
    untitled: !title,
    ticker: row.ticker?.trim() ? row.ticker.trim().toUpperCase() : null,
    where: `Spine ${Math.min(p.resumeAt + 1, SPINE_LENGTH)} of ${SPINE_LENGTH} · ${whereLine(facts.type, facts, row)}`,
    done: p.done,
    total: p.total,
    percent: Math.round((p.done / p.total) * 100),
    touchedAt: row.updated_at ?? row.created_at,
    href: `/studio/compose?id=${row.id}`,
  };
}
