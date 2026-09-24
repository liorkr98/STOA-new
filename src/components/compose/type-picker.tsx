"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { ComposeHeader } from "@/components/compose/compose-header";
import { ComposeBackLink } from "@/components/compose/compose-back-link";
import { PUBLICATION_TYPES, type PublicationType, type PublicationTypeDef } from "@/lib/compose/modes";
import type { DraftSummary } from "@/lib/compose/drafts";
import { DeleteDraftDialog } from "@/components/studio/delete-dialog";

/**
 * The first screen of Compose: what are you publishing?
 *
 * Three jobs rather than three file types, described by purpose, because
 * "reach people who don't know you" is a question an analyst can answer
 * about today and "video" is not. On a phone all three fit above the fold
 * as compact rows, each one tap to start; on a desktop they are cards.
 * Under them, the drafts: type, headline, when it was last touched, and how
 * far along its two-step spine it is.
 */

export interface PickerDraft extends DraftSummary {
  /** "2 days ago", computed where the clock is read, never during render. */
  editedLabel: string;
}

function typeHref(key: PublicationType): string {
  return `/studio/compose?type=${key}`;
}

function TypeCard({ def }: { def: PublicationTypeDef }) {
  return (
    <Link
      href={typeHref(def.key)}
      className="focus-ring flex min-h-[19rem] flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 text-left transition-colors hover:border-[var(--ink)]"
    >
      <div className="flex items-center gap-2">
        <span className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">{def.label}</span>
      </div>
      <p className="mt-3 font-display text-[1.5rem] font-semibold leading-[1.15] tracking-tight text-text">
        {def.purpose}
      </p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-mute">{def.detail}</p>
      <div className="mt-auto border-t border-border pt-3">
        <p className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Seen by · {def.seenBy}
        </p>
      </div>
    </Link>
  );
}

/**
 * The phone's compact row: one tap starts the type. It used to be a
 * disclosure whose detail and Start button opened on a tap, which cost a
 * second tap on every publication; the row now carries what the card says
 * (the label, its purpose, who sees it) and is itself the link.
 */
function TypeRow({ def }: { def: PublicationTypeDef }) {
  return (
    <li>
      <Link
        href={typeHref(def.key)}
        className="focus-ring flex w-full items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-3.5 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">{def.label}</span>
          </span>
          <span className="mt-1 line-clamp-2 block font-display text-[1.125rem] font-semibold leading-tight tracking-tight text-text">
            {def.purpose}
          </span>
          <span className="num mt-1 block truncate text-[9px] uppercase tracking-[0.14em] text-text-faint">
            Seen by · {def.seenBy}
          </span>
        </span>
        <ChevronRight size={16} aria-hidden className="mt-2 shrink-0 text-text-faint" />
      </Link>
    </li>
  );
}

function Progress({ percent, label }: { percent: number; label?: boolean }) {
  return (
    <div className={cn("shrink-0", label ? "w-[7rem]" : "w-[4rem]")}>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-border" aria-hidden>
        <div className="h-full bg-[var(--ink)]" style={{ width: `${percent}%` }} />
      </div>
      {label ? (
        <p className="num mt-1 text-[9px] uppercase tracking-[0.14em] text-text-faint">{percent}% there</p>
      ) : null}
    </div>
  );
}

function DraftRowWide({ d }: { d: PickerDraft }) {
  const meta = [d.ticker, d.where, `Edited ${d.editedLabel}`].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3.5">
      <span className="num w-[5.5rem] shrink-0 text-[10px] uppercase tracking-[0.16em] text-text-mute">
        {d.typeLabel}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("user-copy truncate font-display text-[1.125rem] font-semibold tracking-tight", d.untitled ? "text-text-mute" : "text-text")}>
          {d.title}
        </p>
        <p className="num mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] text-text-faint">{meta}</p>
      </div>
      <Progress percent={d.percent} label />
      <Link
        href={d.href}
        className="num focus-ring shrink-0 rounded-[var(--radius-btn)] border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-text transition-colors hover:border-[var(--ink)]"
      >
        Resume
      </Link>
      {/* Delete sits on the row itself: a draft that should not have been
          kept must be one press away from going, not a trip to Studio. */}
      <span className="num shrink-0 text-[10px] uppercase tracking-[0.14em] text-text-faint">
        <DeleteDraftDialog id={d.id} title={d.title} />
      </span>
    </li>
  );
}

function DraftRowCompact({ d }: { d: PickerDraft }) {
  return (
    <li className="flex items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface pr-3">
      <Link href={d.href} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-card)] px-3.5 py-3">
        <span className="min-w-0 flex-1">
          <span className="num block truncate text-[9px] uppercase tracking-[0.14em] text-text-mute">
            {d.typeLabel} · {d.where}
          </span>
          <span className={cn("user-copy mt-0.5 block truncate font-display text-[1rem] font-semibold tracking-tight", d.untitled ? "text-text-mute" : "text-text")}>
            {d.title}
          </span>
        </span>
        <Progress percent={d.percent} />
      </Link>
      <span className="num shrink-0 text-[10px] uppercase tracking-[0.14em] text-text-faint">
        <DeleteDraftDialog id={d.id} title={d.title} />
      </span>
    </li>
  );
}

export function ComposePicker({ drafts }: { drafts: PickerDraft[] }) {
  return (
    <div className="flex min-h-full flex-col">
      <ComposeHeader>
        <span className="num hidden text-[10px] uppercase tracking-[0.16em] text-text-faint md:inline">
          Nothing to save yet
        </span>
      </ComposeHeader>

      <div className="mx-auto w-full max-w-[var(--w-standard)] px-4 py-5 md:px-8 md:py-10">
        <p className="num text-[10px] uppercase tracking-[0.18em] text-text-faint md:hidden">New publication</p>
        <h1 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-text md:mt-0 md:text-[2.75rem]">
          What are you publishing?
        </h1>
        <p className="mt-2 hidden max-w-[58ch] text-[1.0625rem] leading-relaxed text-text-mute md:block">
          Three jobs, not three file types. Pick the one that matches what you are trying to do today.
          Everything after it is two short steps.
        </p>

        {/* Cards on a desktop; compact rows on a phone, all above the fold, each a
            link that starts its type in one tap. */}
        <div className="mt-6 hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
          {PUBLICATION_TYPES.map((def) => (
            <TypeCard key={def.key} def={def} />
          ))}
        </div>
        <ul className="mt-4 flex flex-col gap-2 md:hidden">
          {PUBLICATION_TYPES.map((def) => (
            <TypeRow key={def.key} def={def} />
          ))}
        </ul>

        <section aria-label="Drafts" className="mt-8 border-t border-border pt-5 md:mt-12 md:pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">
              <span className="hidden md:inline">Or pick up something unfinished · </span>
              <span className="md:hidden">Unfinished · </span>
              {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
            </p>
            <p className="hidden font-display text-[0.9375rem] italic text-text-mute md:block">
              Drafts open at the step you stopped on.
            </p>
            <ComposeBackLink className="rounded-[var(--radius-btn)] border border-border px-2.5 py-1 md:hidden">
              All
            </ComposeBackLink>
          </div>

          {drafts.length === 0 ? (
            <p className="mt-4 text-[0.875rem] leading-relaxed text-text-mute">
              Nothing unfinished. Whatever you start above saves itself as you go.
            </p>
          ) : (
            <>
              <ul className="mt-4 hidden flex-col gap-2.5 md:flex">
                {drafts.map((d) => (
                  <DraftRowWide key={d.id} d={d} />
                ))}
              </ul>
              <ul className="mt-3 flex flex-col gap-2 md:hidden">
                {drafts.map((d) => (
                  <DraftRowCompact key={d.id} d={d} />
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
