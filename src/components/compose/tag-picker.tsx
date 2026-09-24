"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { ALL_TAGS, TAG_GROUPS, TAG_LIMITS, tagBySlug, tagForSector, type PublicationTag } from "@/lib/tags/taxonomy";

export interface TagSelection {
  primary: string | null;
  secondary: string[];
  /** True once the creator overrode the auto-filled primary; auto-fill then stops. */
  primaryPinned: boolean;
}

export const EMPTY_TAGS: TagSelection = { primary: null, secondary: [], primaryPinned: false };

/** The most-used tags, in order, as tag objects. At most this many. */
const MOST_USED_MAX = 8;

/**
 * The tag list: type to narrow rather than scroll.
 *
 * Before anything is typed the most-used tags come first, then the whole
 * list by group, so the options worth having are the ones in view. Typing
 * narrows it to one flat list, names that begin with the query before names
 * that merely contain it, the same way Explore's filters behave. The list
 * is closed: when nothing matches it says so and offers the nearest, never
 * a way to invent a tag the placement rules would not know.
 *
 * Module level rather than nested in TagPicker: a component declared during
 * render is a new type on every render, so the open list would unmount and
 * remount (losing its scroll position and its field) on each keystroke.
 */
function TagSearch({
  slot,
  primary,
  secondary,
  popular,
  onPick,
  onClose,
  focusOnMount = true,
}: {
  slot: "primary" | "secondary";
  primary: string | null;
  secondary: string[];
  /** Slugs, most used first. */
  popular: string[];
  onPick: (slot: "primary" | "secondary", tag: PublicationTag) => void;
  onClose: () => void;
  /**
   * The field takes focus when the creator opened the list. The list that
   * is open on arrival does not: a keyboard rising over the chips on a phone
   * would hide the one tap the screen asks for.
   */
  focusOnMount?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  const taken = (t: PublicationTag) => t.slug === primary || secondary.includes(t.slug);

  const mostUsed = useMemo(
    () =>
      popular
        .map(tagBySlug)
        .filter((t): t is PublicationTag => Boolean(t))
        .slice(0, MOST_USED_MAX),
    [popular],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const starts: PublicationTag[] = [];
    const contains: PublicationTag[] = [];
    for (const t of ALL_TAGS) {
      const label = t.label.toLowerCase();
      if (label.startsWith(q) || t.slug.startsWith(q)) starts.push(t);
      else if (label.includes(q) || t.slug.includes(q)) contains.push(t);
    }
    return [...starts, ...contains];
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!matches) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      return;
    }
    const open = matches.filter((t) => !taken(t));
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(open.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Enter": {
        e.preventDefault();
        const pick = open[Math.min(active, open.length - 1)];
        if (pick) onPick(slot, pick);
        break;
      }
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  const chip = (t: PublicationTag, highlighted = false) => (
    <button
      key={t.slug}
      type="button"
      role="option"
      aria-selected={highlighted}
      disabled={taken(t)}
      onClick={() => onPick(slot, t)}
      onMouseEnter={() => {
        if (matches) setActive(matches.filter((m) => !taken(m)).indexOf(t));
      }}
      className={cn(
        "focus-ring rounded-[var(--radius-tag)] border px-2 py-0.5 text-[11px]",
        taken(t)
          ? "border-border text-text-faint"
          : highlighted
            ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
            : "border-border text-text hover:border-border-strong",
      )}
    >
      {t.label}
    </button>
  );

  const openMatches = matches?.filter((t) => !taken(t)) ?? [];

  return (
    <div className="menu-pop mt-2 rounded-[var(--radius-btn)] border border-border bg-surface p-2">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="Type to narrow"
        aria-label={`Search tags for the ${slot} tag`}
        autoComplete="off"
        spellCheck={false}
        className="num mb-2 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-2.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-text outline-none placeholder:text-text-faint focus-visible:border-[var(--ink)]"
      />
      <div role="listbox" aria-label="Tags" className="scroll-area max-h-[280px] overflow-y-auto">
        {matches ? (
          matches.length === 0 ? (
            <p className="num px-1 py-2 text-[10px] uppercase tracking-[0.14em] text-text-faint">
              Nothing matches. Tags are a fixed list; try a sector or a theme.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1 px-1 pb-1">
              {matches.map((t) => chip(t, openMatches[active]?.slug === t.slug))}
            </div>
          )
        ) : (
          <>
            {mostUsed.length > 0 ? (
              <div className="mb-2">
                <div className="num px-1 pb-1 text-[10px] uppercase tracking-[0.16em] text-text-faint">
                  Most used
                </div>
                <div className="flex flex-wrap gap-1">{mostUsed.map((t) => chip(t))}</div>
              </div>
            ) : null}
            {TAG_GROUPS.map((g) => (
              <div key={g.key} className="mb-2 last:mb-0">
                <div className="num px-1 pb-1 text-[10px] uppercase tracking-[0.16em] text-text-faint">
                  {g.label}
                </div>
                <div className="flex flex-wrap gap-1">{g.tags.map((t) => chip(t))}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Tagging: a closed curated list, one PRIMARY tag that drives placement, up
 * to two SECONDARY tags that are searchable only. The primary auto-fills from
 * the stance's ticker sector when there is a stance (overridable in one
 * click); nothing auto-fills without one. The two roles are visually distinct: the
 * primary is a solid ink chip, secondaries are outlined. Choosing opens a
 * list you type into (TagSearch above) rather than one you scroll.
 */
export function TagPicker({
  value,
  onChange,
  stanceSector,
  hasStance,
  popular = [],
}: {
  value: TagSelection;
  onChange: (v: TagSelection) => void;
  /** Sector of the stance's ticker, when known. */
  stanceSector: string | null;
  hasStance: boolean;
  /** Tag slugs by how often they are used across published work, most used first. */
  popular?: string[];
}) {
  const [open, setOpen] = useState<"primary" | "secondary" | null>(null);
  // The primary list shows on arrival while nothing is chosen, so the tag is
  // one tap away rather than two. Derived, not set: choosing a tag (or the
  // stance filling one in) closes it by itself, and a press on Choose primary
  // while it shows puts it away until the creator asks again.
  const [openedByPress, setOpenedByPress] = useState(false);
  const [defaultDismissed, setDefaultDismissed] = useState(false);
  const primaryOpen = open === "primary" || (open === null && !value.primary && !defaultDismissed);

  useEffect(() => {
    if (!hasStance || value.primaryPinned || value.primary) return;
    const auto = tagForSector(stanceSector);
    if (auto) onChange({ ...value, primary: auto.slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStance, stanceSector]);

  const primary = value.primary ? tagBySlug(value.primary) : undefined;
  const secondaries = value.secondary.map(tagBySlug).filter((t): t is PublicationTag => Boolean(t));
  const autoFilled = hasStance && !value.primaryPinned && primary && tagForSector(stanceSector)?.slug === primary.slug;

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
      <p className="t-eyebrow mb-3">Tags</p>

      <div className="num mb-1.5 text-[10px] uppercase tracking-[0.16em] text-text-mute">Primary</div>
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
          onClick={() => {
            if (primaryOpen) {
              setOpen(null);
              setDefaultDismissed(true);
              return;
            }
            setOpenedByPress(true);
            setOpen("primary");
          }}
          className="focus-ring rounded-[var(--radius-tag)] border border-dashed border-border px-2.5 py-1 text-[12px] text-text-mute hover:text-text"
        >
          {primary ? "Change" : "Choose primary"}
        </button>
      </div>
      {primaryOpen ? (
        <TagSearch
          slot="primary"
          primary={value.primary}
          secondary={value.secondary}
          popular={popular}
          onPick={pick}
          onClose={() => setOpen(null)}
          focusOnMount={openedByPress}
        />
      ) : null}

      <div className="num mb-1.5 mt-4 text-[10px] uppercase tracking-[0.16em] text-text-mute">
        Secondary · search only · {secondaries.length}/{TAG_LIMITS.secondary}
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
            onClick={() => {
            setOpenedByPress(true);
            setOpen(open === "secondary" ? null : "secondary");
          }}
            className="focus-ring rounded-[var(--radius-tag)] border border-dashed border-border px-2.5 py-1 text-[12px] text-text-mute hover:text-text"
          >
            Add secondary
          </button>
        ) : null}
      </div>
      {open === "secondary" ? (
        <TagSearch
          slot="secondary"
          primary={value.primary}
          secondary={value.secondary}
          popular={popular}
          onPick={pick}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}
