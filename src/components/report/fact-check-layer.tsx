"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChatCircle } from "@phosphor-icons/react";
import type { ClaimType, FactClaim } from "@/lib/ai/fact-check";
import { DebateThread } from "@/components/report/debate-thread";
import { ClaimVoteBar } from "@/components/report/claim-vote-bar";
import type { Comment } from "@/lib/types";

export type Verdict = "fact" | "unproven" | "opinion" | "contradicted";

const VERDICT_MAP: Record<ClaimType, Verdict> = {
  Fact: "fact",
  "Yahoo-Verified": "fact",
  Unverified: "unproven",
  Opinion: "opinion",
  Misleading: "contradicted",
  "Yahoo-Disputed": "contradicted",
};

const VERDICT_STYLE: Record<Verdict, { color: string; label: string }> = {
  fact: { color: "var(--verdigris)", label: "Fact" },
  unproven: { color: "var(--brass)", label: "Unproven" },
  opinion: { color: "var(--plum)", label: "Opinion" },
  contradicted: { color: "var(--rust)", label: "Contradicted" },
};

function verdictOf(claim: FactClaim): Verdict {
  return VERDICT_MAP[claim.type] ?? "unproven";
}

/**
 * Summary strip above the report body. Exists so a skimming reader gets the
 * fact-check signal even if they never hover a single inline claim. Each
 * segment jump-scrolls to the first claim of that type.
 */
export function FactCheckLayer({
  claims,
  className,
}: {
  claims: FactClaim[];
  className?: string;
}) {
  const counts = useMemo(() => {
    const c: Record<Verdict, number> = { fact: 0, unproven: 0, opinion: 0, contradicted: 0 };
    for (const claim of claims) c[verdictOf(claim)]++;
    return c;
  }, [claims]);

  if (claims.length === 0) return null;

  function jumpTo(verdict: Verdict) {
    const el = document.querySelector(`[data-claim-verdict="${verdict}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div
      className={
        className ??
        "mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-border py-3 t-meta"
      }
    >
      <span className="font-medium text-text">{claims.length} claims checked</span>
      {(Object.keys(counts) as Verdict[])
        .filter((v) => counts[v] > 0)
        .map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => jumpTo(v)}
            className="inline-flex items-center gap-1 transition-colors hover:text-text focus-ring rounded-[var(--r-tag)]"
          >
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: VERDICT_STYLE[v].color }} />
            {counts[v]} {VERDICT_STYLE[v].label.toLowerCase()}
          </button>
        ))}
    </div>
  );
}

interface Segment {
  text: string;
  claim: FactClaim | null;
}

/**
 * Locates each claim's text within this block's plain text and splits it
 * into marked/unmarked segments. report_bodies claims don't carry char
 * offsets (see BACKEND_DATA_CONTRACTS.md), so this does a plain substring
 * search per block at render time instead. First match wins; overlapping
 * or repeated claim text is a known edge case, not handled here.
 */
function segmentText(text: string, claims: FactClaim[]): Segment[] {
  const matches: { start: number; end: number; claim: FactClaim }[] = [];
  for (const claim of claims) {
    if (!claim.text?.trim()) continue;
    const idx = text.indexOf(claim.text);
    if (idx === -1) continue;
    matches.push({ start: idx, end: idx + claim.text.length, claim });
  }
  matches.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue; // overlapping match, skip
    if (m.start > cursor) segments.push({ text: text.slice(cursor, m.start), claim: null });
    segments.push({ text: text.slice(m.start, m.end), claim: m.claim });
    cursor = m.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), claim: null });
  return segments;
}

export function FactCheckedText({
  text,
  claims,
  isAuthed = false,
  reportId,
}: {
  text: string;
  claims: FactClaim[];
  isAuthed?: boolean;
  reportId?: string;
}) {
  const segments = useMemo(() => segmentText(text, claims), [text, claims]);
  return (
    <>
      {segments.map((seg, i) =>
        seg.claim ? (
          <ClaimMark key={i} claim={seg.claim} isAuthed={isAuthed} reportId={reportId}>
            {seg.text}
          </ClaimMark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

// Shared across every ClaimMark on the page (Emil's tooltip-group pattern,
// docs/MOTION.md A.3): the first popover a reader opens animates; while they
// scan claim-to-claim with under-300ms gaps, subsequent popovers appear
// instantly. The group goes cold after 1.5s idle.
let lastClaimCloseAt = 0;

function ClaimMark({
  claim,
  children,
  isAuthed,
  reportId,
}: {
  claim: FactClaim;
  children: string;
  isAuthed: boolean;
  reportId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const [debateOpen, setDebateOpen] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const verdict = verdictOf(claim);
  const { color, label } = VERDICT_STYLE[verdict];

  function setOpenGrouped(next: boolean) {
    const now = Date.now();
    if (next) {
      setInstant(now - lastClaimCloseAt < 300);
    } else {
      lastClaimCloseAt = now;
    }
    setOpen(next);
  }

  function addLocalReply(body: string) {
    // Not persisted -- debate_threads/debate_replies don't exist yet (see
    // BACKEND_DATA_CONTRACTS.md). Optimistic local append proves the UI;
    // swap for a server action once that table lands.
    setReplies((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        report_id: "",
        author_id: "",
        body,
        likes: 0,
        created_at: new Date().toISOString(),
      },
    ]);
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpenGrouped}>
        <Popover.Trigger asChild>
          <button
            type="button"
            data-claim-verdict={verdict}
            className="cursor-default rounded-sm underline decoration-2 underline-offset-2 transition-colors duration-[var(--dur-1)] ease-[var(--ease-hover)] hover:bg-surface-2 focus-ring"
            style={{ textDecorationColor: color }}
            onMouseEnter={() => setOpenGrouped(true)}
            onMouseLeave={() => setOpenGrouped(false)}
          >
            {children}
            {verdict === "opinion" && (
              <ChatCircle size={12} weight="fill" className="ml-0.5 inline align-super" style={{ color }} />
            )}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={`popover-content ledger-card z-40 max-w-xs p-3 text-sm ${instant ? "popover-instant" : ""}`}
            sideOffset={6}
            onMouseEnter={() => setOpenGrouped(true)}
            onMouseLeave={() => setOpenGrouped(false)}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="t-eyebrow" style={{ color }}>
                {label}
              </span>
              {claim.confidence && <span className="t-meta">&middot; {claim.confidence} confidence</span>}
            </div>
            {claim.note && <p className="t-body">{claim.note}</p>}
            {claim.yahooCheck && (
              <p className="t-meta mt-1" style={{ color: claim.yahooCheck.match ? "var(--verdigris)" : "var(--rust)" }}>
                Yahoo: {claim.yahooCheck.detail}
              </p>
            )}
            {verdict === "opinion" && (
              <button
                type="button"
                className="t-meta mt-2 inline-flex items-center gap-1 underline hover:no-underline"
                onClick={() => {
                  setOpen(false);
                  setDebateOpen(true);
                }}
              >
                <ChatCircle size={12} weight="fill" />
                Debate this claim
              </button>
            )}
            {reportId && open && (
              <ClaimVoteBar reportId={reportId} claimText={claim.text} isAuthed={isAuthed} />
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {verdict === "opinion" && (
        <DebateThread
          open={debateOpen}
          onOpenChange={setDebateOpen}
          claimText={claim.text}
          replies={replies}
          onReply={addLocalReply}
          isAuthed={isAuthed}
        />
      )}
    </>
  );
}
