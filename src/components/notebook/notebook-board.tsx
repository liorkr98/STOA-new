"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Search, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { SnippetCard } from "@/components/ui/snippet-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createNotebookAction,
  deleteEntryAction,
  listEntriesAction,
} from "@/app/actions/notebooks";
import type { Notebook, NotebookEntry } from "@/lib/db/notebooks";

/**
 * The Notebook board (Part F): a dense --surface-2 field with --surface snippet
 * cards, collections in a left rail, search + tag filter, and "Compose from
 * notebook". Shared by the investor (/notebook) and analyst (/studio/notebook)
 * surfaces; `mode` only changes the compose destination.
 */

function entryQuote(entry: NotebookEntry): string {
  const p = entry.payload as { quote?: string; text?: string; label?: string; value?: string };
  if (p.quote) return p.quote;
  if (p.text) return p.text;
  if (p.label || p.value) return `${p.label ?? ""} ${p.value ?? ""}`.trim();
  return entry.kind;
}

export function NotebookBoard({
  notebooks: initialNotebooks,
  initialNotebookId,
  initialEntries,
  mode = "investor",
}: {
  notebooks: Notebook[];
  initialNotebookId?: string;
  initialEntries: NotebookEntry[];
  mode?: "investor" | "analyst";
}) {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [selectedId, setSelectedId] = useState(initialNotebookId ?? null);
  const [entries, setEntries] = useState<NotebookEntry[]>(initialEntries);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const allTags = useMemo(
    () => [...new Set(entries.flatMap((e) => e.tags))].sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (activeTag && !e.tags.includes(activeTag)) return false;
      if (!q) return true;
      return entryQuote(e).toLowerCase().includes(q) || e.tags.some((t) => t.includes(q));
    });
  }, [entries, query, activeTag]);

  function selectNotebook(id: string) {
    setSelectedId(id);
    setActiveTag(null);
    startTransition(async () => {
      setEntries(await listEntriesAction(id));
    });
  }

  function createNotebook() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    startTransition(async () => {
      const nb = await createNotebookAction(title);
      if (nb) {
        setNotebooks((prev) => [{ ...nb, entry_count: 0 }, ...prev]);
        setSelectedId(nb.id);
        setEntries([]);
      }
    });
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    startTransition(async () => {
      await deleteEntryAction(id);
    });
  }

  const selected = notebooks.find((n) => n.id === selectedId);

  return (
    <div className="grid min-h-[70vh] grid-cols-1 gap-4 bg-surface-2 p-4 md:grid-cols-[220px_1fr]">
      {/* Collections rail */}
      <aside className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <BookOpen size={16} className="text-text-faint" />
          <h2 className="t-eyebrow">Notebooks</h2>
        </div>
        <ul className="flex flex-col gap-0.5">
          {notebooks.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => selectNotebook(n.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-[var(--radius-btn)] px-2.5 py-2 text-left text-sm transition-colors",
                  n.id === selectedId
                    ? "bg-surface text-text"
                    : "text-text-mute hover:bg-surface/60",
                )}
              >
                <span className="truncate">{n.title}</span>
                {typeof n.entry_count === "number" && (
                  <span className="num text-[11px] text-text-faint">{n.entry_count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex items-center gap-1">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createNotebook()}
            placeholder="New notebook"
            className="h-8 flex-1 rounded-[var(--radius-btn)] border border-border bg-surface px-2 text-sm focus-ring"
          />
          <button
            type="button"
            aria-label="Create notebook"
            onClick={createNotebook}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-btn)] border border-border bg-surface text-text-mute hover:text-text focus-ring"
          >
            <Plus size={15} />
          </button>
        </div>
      </aside>

      {/* Board */}
      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="t-h3 flex-1 truncate">{selected?.title ?? "Notebook"}</h1>
          {selected && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `${mode === "analyst" ? "/studio/compose" : "/studio/compose"}?notebook=${selected.id}`,
                )
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] bg-accent px-3 text-[13px] font-semibold text-accent-ink focus-ring"
            >
              <Pencil size={14} /> Compose from notebook
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="relative flex-1 min-w-[180px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entries"
              className="h-9 w-full rounded-[var(--radius-btn)] border border-border bg-surface pl-8 pr-3 text-sm focus-ring"
            />
          </span>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag((t) => (t === tag ? null : tag))}
              className={cn(
                "rounded-[var(--radius-tag)] border px-2 py-1 text-[11px] transition-colors",
                activeTag === tag
                  ? "border-transparent bg-[var(--ink)] text-[var(--paper)]"
                  : "border-border bg-surface text-text-mute hover:text-text",
              )}
            >
              {tag}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={22} />}
            title={entries.length === 0 ? "No entries yet" : "Nothing matches"}
            body={
              entries.length === 0
                ? "Save a quote, figure, or chart from any report to start building your research."
                : "Try a different search or tag."
            }
          />
        ) : (
          <div
            className={cn(
              "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
              pending && "opacity-70",
            )}
          >
            {filtered.map((entry) => (
              <SnippetCard
                key={entry.id}
                quote={entryQuote(entry)}
                tags={entry.tags}
                accent={entry.color ?? undefined}
                source={
                  entry.source
                    ? {
                        label: entry.source.title ?? entry.source.ticker ?? entry.kind,
                        detail: entry.source.asOf,
                        href: entry.source.url,
                      }
                    : { label: entry.kind }
                }
                footer={
                  <button
                    type="button"
                    aria-label="Delete entry"
                    onClick={() => removeEntry(entry.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-text-faint hover:text-[var(--down)] focus-ring"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
