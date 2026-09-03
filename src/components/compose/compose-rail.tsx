"use client";

import { Layers, Sparkles, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * The toolbox rail.
 *
 * Left is what you build with, right is what you publish as, so this side
 * holds the deck and the assistant and nothing else. The profile navigation
 * that used to sit here is not a tool for making a publication, and on a
 * screen with two rails and a canvas it was taking width from the work.
 *
 * Three rails plus a canvas do not fit a laptop, so the rail collapses to
 * icons and expands on demand; below the large breakpoint it becomes a
 * drawer over the canvas instead, because at that width there is no rail to
 * shrink into.
 *
 * The rail is a column of the compose frame and scrolls on its own. It is
 * not sticky and is not offset from any header: it starts where the header
 * ends because that is where the frame puts it.
 */

export function RailIcons({
  cardCount,
  onExpand,
}: {
  cardCount: number;
  onExpand: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Cards (${cardCount})`}
        title={`Cards (${cardCount})`}
        className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-btn)] border border-border bg-surface text-text-mute hover:text-text"
      >
        <Layers size={16} />
        {cardCount > 0 ? (
          <span className="num absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ink)] px-1 text-[10px] text-[var(--paper)]">
            {cardCount}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={onExpand}
        aria-label="Assistant"
        title="Assistant"
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-[var(--radius-btn)] border border-border bg-surface text-text-mute hover:text-text"
      >
        <Sparkles size={16} />
      </button>
    </div>
  );
}

export function ComposeRail({
  collapsed,
  onToggle,
  cardCount,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  cardCount: number;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label="Toolbox"
      className={cn(
        "scroll-area hidden min-h-0 shrink-0 overflow-y-auto border-r border-border lg:block",
        collapsed ? "w-[56px]" : "w-[248px]",
      )}
    >
      {collapsed ? (
        <RailIcons cardCount={cardCount} onExpand={onToggle} />
      ) : (
        <div className="flex flex-col gap-5 p-3">
          <div className="flex items-center justify-between">
            <span className="num text-[10px] uppercase tracking-[0.2em] text-text-faint">Toolbox</span>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse the toolbox"
              className="focus-ring rounded p-1 text-text-faint hover:text-text"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
          {children}
        </div>
      )}
    </aside>
  );
}

/** The same rail as a drawer, for screens with no room to hold one open. */
export function ComposeRailDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close the toolbox"
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
      />
      <div
        role="dialog"
        aria-label="Toolbox"
        className="scroll-area absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col gap-5 overflow-y-auto border-r border-border bg-paper p-4"
      >
        <div className="flex items-center justify-between">
          <span className="num text-[10px] uppercase tracking-[0.2em] text-text-faint">Toolbox</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the toolbox"
            className="focus-ring rounded p-1 text-text-mute hover:text-text"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function RailOpenButton({ onClick, cardCount }: { onClick: () => void; cardCount: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open the toolbox (${cardCount} cards)`}
      className="focus-ring relative flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-2.5 text-xs font-medium text-text-mute transition-colors hover:text-text lg:hidden"
    >
      <PanelLeftOpen size={15} />
      <span className="hidden sm:inline">Toolbox</span>
      {cardCount > 0 ? (
        <span className="num rounded-full bg-[var(--ink)] px-1.5 text-[10px] text-[var(--paper)]">{cardCount}</span>
      ) : null}
    </button>
  );
}
