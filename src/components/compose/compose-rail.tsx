"use client";

import { PanelLeftOpen, X } from "lucide-react";

/**
 * The toolbox rail.
 *
 * Left is what you build with, right is what you publish as, so this side
 * holds the deck and the assistant and nothing else. The rail exists only
 * where the screen can take what it holds (`railFor` in
 * src/lib/compose/rail.ts) and is absent everywhere else: it never folds to
 * a column of icons, because a rail that is there is there for a reason.
 * Below the large breakpoint it becomes a drawer over the canvas, opened
 * from a button in the top bar.
 *
 * The rail is a column of the compose frame and scrolls on its own. It is
 * not sticky and is not offset from any header: it starts where the header
 * ends because that is where the frame puts it.
 */

export function ComposeRail({ children }: { children: React.ReactNode }) {
  return (
    <aside
      aria-label="Toolbox"
      className="scroll-area hidden min-h-0 w-[248px] shrink-0 overflow-y-auto border-r border-border lg:block"
    >
      <div className="flex flex-col gap-5 p-3">
        <span className="num text-[10px] uppercase tracking-[0.2em] text-text-faint">Toolbox</span>
        {children}
      </div>
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
