"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { TAG_GROUPS, TAG_LIMITS, tagBySlug, tagForSector, type PublicationTag } from "@/lib/tags/taxonomy";

export interface TagSelection {
  primary: string | null;
  secondary: string[];
  /** True once the creator overrode the auto-filled primary; auto-fill then stops. */
  primaryPinned: boolean;
}

export const EMPTY_TAGS: TagSelection = { primary: null, secondary: [], primaryPinned: false };

/**
 * The tag menu. Module level rather than nested in TagPicker: a component
 * declared during render is a new type on every render, so the open menu would
 * unmount and remount (losing its scroll position) on each keystroke.
 */
function TagList({
  slot,
  primary,
  secondary,
  onPick,
}: {
  slot: "primary" | "secondary";
  primary: string | null;
  secondary: string[];
  onPick: (slot: "primary" | "secondary", tag: PublicationTag) => void;
}) {
  return (
    <div className="menu-pop mt-2 max-h-[280px] overflow-y-auto scroll-area rounded-[var(--radius-btn)] border border-border bg-surface p-2">
      {TAG_GROUPS.map((g) => (
        <div key={g.key} className="mb-2 last:mb-0">
          <div className="num px-1 pb-1 text-[10px] uppercase tracking-[0.16em] text-text-faint">{g.label}</div>
          <div className="flex flex-wrap gap-1">
            {g.tags.map((t) => {
              const taken = t.slug === primary || secondary.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  type="button"
                  disabled={taken}
                  onClick={() => onPick(slot, t)}
                  className={cn(
                    "focus-ring rounded-[var(--radius-tag)] border px-2 py-0.5 text-[11px]",
                    taken ? "border-border text-text-faint" : "border-border text-text hover:border-border-strong",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Tagging: a closed curated list, one PRIMARY tag that drives placement, up
 * to two SECONDARY tags that are searchable only. The primary auto-fills from
 * the call's ticker sector when a call exists (overridable in one click);
 * nothing auto-fills without a call. The two roles are visually distinct: the
 * primary is a solid ink chip, secondaries are outlined.
 */
export function TagPicker({
  value,
  onChange,
  callSector,
  hasCall,
}: {
  value: TagSelection;
  onChange: (v: TagSelection) => void;
  /** Sector of the call's ticker, when known. */
  callSector: string | null;
  hasCall: boolean;
}) {
  const [open, setOpen] = useState<"primary" | "secondary" | null>(null);

  useEffect(() => {
    if (!hasCall || value.primaryPinned || value.primary) return;
    const auto = tagForSector(callSector);
    if (auto) onChange({ ...value, primary: auto.slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCall, callSector]);

  const primary = value.primary ? tagBySlug(value.primary) : undefined;
  const secondaries = value.secondary.map(tagBySlug).filter((t): t is PublicationTag => Boolean(t));
  const autoFilled = hasCall && !value.primaryPinned && primary && tagForSector(callSector)?.slug === primary.slug;

  const pick = (slot: "primary" | "secondary", tag: PublicationTag) => {
    if (slot === "primary") {
      onChange({ ...value, primary: tag.slug, primaryPinned: true, secondary: value.secondary.filter((s) => s !== tag.slug) });
    } else if (tag.slug !== value.primary && !value.secondary.includes(tag.slug) && value.secondary.length < TAG_LIMITS.secondary) {
      onChange({ ...value, secondary: [...value.secondary, tag.slug] });
    }
    setOpen(null);
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4" aria-label="Tags">
      <p className="t-eyebrow mb-1">Tags</p>
      <p className="mb-3 text-[12px] leading-snug text-text-mute">
        One primary tag places this publication; up to two secondary tags make it searchable. Three total.
      </p>

      <div className="num mb-1.5 text-[10px] uppercase tracking-[0.16em] text-text-mute">Primary · drives placement</div>
      <div className="flex flex-wrap items-center gap-2">
        {primary ? (
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-tag)] bg-[var(--ink)] px-2.5 py-1 text-[12px] font-medium text-[var(--paper)]">
            {primary.label}
            {autoFilled ? <span className="num text-[10px] uppercase tracking-[0.12em] opacity-70">Auto</span> : null}
            <button
              type="button"
              aria-label="Clear primary tag"
              onClick={() => onChange({ ...value, primary: null, primaryPinned: true })}
              className="focus-ring -mr-1 rounded p-0.5 opacity-80 hover:opacity-100"
            >
              <X size={11} />
            </button>
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(open === "primary" ? null : "primary")}
          className="focus-ring rounded-[var(--radius-tag)] border border-dashed border-border px-2.5 py-1 text-[12px] text-text-mute hover:text-text"
        >
          {primary ? "Change" : "Choose primary"}
        </button>
      </div>
      {autoFilled ? (
        <p className="num mt-1.5 text-[10px] uppercase tracking-[0.12em] text-text-faint">Filled from the call&apos;s sector · one click to change</p>
      ) : null}
      {open === "primary" ? (
        <TagList slot="primary" primary={value.primary} secondary={value.secondary} onPick={pick} />
      ) : null}

      <div className="num mb-1.5 mt-4 text-[10px] uppercase tracking-[0.16em] text-text-mute">
        Secondary · searchable only · {secondaries.length}/{TAG_LIMITS.secondary}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {secondaries.map((t) => (
          <span key={t.slug} className="inline-flex items-center gap-1.5 rounded-[var(--radius-tag)] border border-border-strong px-2.5 py-1 text-[12px] text-text">
            {t.label}
            <button
              type="button"
              aria-label={`Remove ${t.label}`}
              onClick={() => onChange({ ...value, secondary: value.secondary.filter((s) => s !== t.slug) })}
              className="focus-ring -mr-1 rounded p-0.5 text-text-mute hover:text-text"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {secondaries.length < TAG_LIMITS.secondary ? (
          <button
            type="button"
            onClick={() => setOpen(open === "secondary" ? null : "secondary")}
            className="focus-ring rounded-[var(--radius-tag)] border border-dashed border-border px-2.5 py-1 text-[12px] text-text-mute hover:text-text"
          >
            Add secondary
          </button>
        ) : null}
      </div>
      {open === "secondary" ? (
        <TagList slot="secondary" primary={value.primary} secondary={value.secondary} onPick={pick} />
      ) : null}

      <p className="num mt-3 border-t border-border pt-2 text-[10px] uppercase tracking-[0.12em] text-text-faint">
        Primary drives placement · secondary tags are searchable
      </p>
    </section>
  );
}
