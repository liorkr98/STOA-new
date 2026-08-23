import type { Direction } from "@/lib/types";
import type { StageMarker } from "@/lib/today/types";

/**
 * The Feed player's publication shape: one video, optionally enriched with a
 * call, an evidence-card stack and a thesis. Built server-side from reports,
 * predictions and video clips (or from fixtures under /dev), never from
 * anything that would put Bunny/env code in the browser.
 */

export type ProvenanceInk = "plain" | "creator_est" | "auto";

/** Every card carries provenance: the creator's view, their own number, or an imported fact. */
export interface InkValue {
  text: string;
  ink: ProvenanceInk;
}

export type FeedCard =
  | { kind: "thesis"; id: string; locked: boolean; title: string; body: string }
  | { kind: "edge"; id: string; locked: boolean; street: InkValue[]; mine: InkValue[] }
  | { kind: "path_to_target"; id: string; locked: boolean; steps: { label: string; value: InkValue }[]; result: InkValue }
  | { kind: "kill_switch"; id: string; locked: boolean; conditions: InkValue[] }
  | { kind: "catalyst_timeline"; id: string; locked: boolean; events: { dateISO: string; label: string; past: boolean }[] }
  | { kind: "checklist"; id: string; locked: boolean; rows: { label: string; status: "done" | "pending" | "failed"; ink: ProvenanceInk }[] }
  | { kind: "figure"; id: string; locked: boolean; caption: string; imageUrl: string | null; source: "creator" | "auto" }
  | { kind: "steelman"; id: string; locked: boolean; objection: string; answer: string }
  | { kind: "unlock"; id: string; locked: false; price: string | null; access: "paid" | "subscribers" | "free" };

export interface FeedComment {
  id: string;
  parentId: string | null;
  author: { handle: string; displayName: string; avatarUrl: string | null; isAuthor: boolean };
  createdAt: string;
  text: string;
  likes: number;
  /** Set when a reply to a reply was flattened one level up. */
  replyingTo?: string | null;
}

export interface FeedPublication {
  id: string;
  clipId: string | null;
  /** Bunny embed URL when a real clip exists; null renders the poster stage. */
  embedUrl: string | null;
  /** Direct mp4/webm when the clip is a file the browser can play. */
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number;
  headline: string;
  deck: string | null;
  typeLabel: "CALL" | "RESEARCH" | "NOTE";
  ticker: string | null;
  direction: Direction | null;
  themeTag: string | null;
  sector: string | null;
  contentBadge: string;
  stageMarker: StageMarker;
  analyst: { id: string; handle: string; displayName: string; avatarUrl: string | null };
  seal: { status: "hit" | "miss" | "near"; dateISO: string } | null;
  access: "free" | "paid" | "subscribers";
  price: number | null;
  cards: FeedCard[];
  comments: FeedComment[];
  publishedAt: string;
}
