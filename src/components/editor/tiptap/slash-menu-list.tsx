"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/design/cn";
import type { SlashItem } from "./slash-menu";

export interface SlashMenuListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

/**
 * The slash command palette. Pure presentation over the items the suggestion
 * plugin hands it; keyboard nav is exposed via ref so the ProseMirror
 * keydown handler drives selection without stealing the editor's own keys.
 */
export const SlashMenuList = forwardRef<
  SlashMenuListRef,
  { items: SlashItem[]; command: (item: SlashItem) => void }
>(function SlashMenuList({ items, command }, ref) {
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSelected(0), [items]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false;
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelected((s) => (s - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          if (items[selected]) command(items[selected]);
          return true;
        }
        return false;
      },
    }),
    [items, selected, command],
  );

  if (items.length === 0) {
    return (
      <div className="w-72 rounded-[var(--r-card)] border border-border bg-surface p-3 text-sm text-text-mute shadow-[var(--shadow-card)]">
        No blocks match.
      </div>
    );
  }

  let lastGroup: string | null = null;

  return (
    <div
      ref={listRef}
      className="max-h-80 w-72 overflow-y-auto rounded-[var(--r-card)] border border-border bg-surface p-1.5 shadow-[var(--shadow-card)] scroll-area"
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const showGroup = item.group !== lastGroup;
        lastGroup = item.group;
        return (
          <div key={item.title}>
            {showGroup && (
              <p className="t-eyebrow px-2.5 pb-1 pt-2 text-[10px]">{item.group}</p>
            )}
            <button
              type="button"
              data-index={i}
              onMouseEnter={() => setSelected(i)}
              onClick={() => command(item)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[var(--radius-btn)] px-2.5 py-2 text-left transition-colors",
                i === selected ? "bg-accent-weak" : "hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-btn)] border",
                  i === selected ? "border-accent/40 text-accent" : "border-border text-text-mute",
                )}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text">{item.title}</span>
                <span className="block truncate text-xs text-text-faint">{item.subtitle}</span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
});
