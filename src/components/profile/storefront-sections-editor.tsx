"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2, Check } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { saveStorefrontSections } from "@/app/actions/profile";
import type { ProfileSection } from "@/lib/editor/types";

/**
 * Editor for the addable storefront sections (B3): richText, faq,
 * featuredReport. Reorder with up/down, toggle visibility, delete, inline
 * edit. Saves only the storefront_sections key (merge-safe).
 */

interface FaqItem {
  q: string;
  a: string;
}

interface ReportOption {
  id: string;
  title: string | null;
}

const ADDABLE: { type: ProfileSection["type"]; label: string }[] = [
  { type: "richText", label: "Text section" },
  { type: "faq", label: "FAQ" },
  { type: "featuredReport", label: "Featured report" },
];

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring";

function emptySection(type: ProfileSection["type"]): ProfileSection {
  const base = { id: nanoid(8), type, visible: true };
  if (type === "faq") return { ...base, data: { items: [{ q: "", a: "" }] } };
  if (type === "richText") return { ...base, data: { title: "", body: "" } };
  return { ...base, data: { reportId: "" } };
}

export function StorefrontSectionsEditor({
  initialSections,
  reports,
}: {
  initialSections: ProfileSection[];
  reports: ReportOption[];
}) {
  const [sections, setSections] = useState<ProfileSection[]>(initialSections);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function patch(id: string, fn: (s: ProfileSection) => ProfileSection) {
    setSaved(false);
    setSections((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
  }

  function move(index: number, dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= sections.length) return;
    setSaved(false);
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function save() {
    start(async () => {
      const res = await saveStorefrontSections(sections);
      if (res.ok) setSaved(true);
    });
  }

  return (
    <div className="surface flex flex-col gap-5 p-6">
      <div>
        <h2 className="t-h3">Storefront sections</h2>
        <p className="t-meta mt-1">
          Add content blocks to your public profile: an about section, an FAQ, or a featured
          report. Drag order matters; hidden sections stay saved.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ADDABLE.map((a) => (
          <button
            key={a.type}
            type="button"
            onClick={() => {
              setSaved(false);
              setSections((prev) => [...prev, emptySection(a.type)]);
            }}
            className="focus-ring inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-border bg-bg px-2.5 py-1.5 text-sm text-text-mute hover:border-border-strong hover:text-text"
          >
            <Plus size={14} /> {a.label}
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <p className="rounded-[var(--radius-btn)] border border-dashed border-border bg-bg px-3 py-6 text-center text-sm text-text-mute">
          No sections yet. Add one above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sections.map((section, i) => (
            <div key={section.id} className="rounded-[var(--radius-card)] border border-border bg-bg p-4">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="text-text-faint hover:text-text disabled:opacity-30 focus-ring"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === sections.length - 1}
                    onClick={() => move(i, 1)}
                    className="text-text-faint hover:text-text disabled:opacity-30 focus-ring"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className="t-eyebrow">
                  {ADDABLE.find((a) => a.type === section.type)?.label ?? section.type}
                </span>
                <button
                  type="button"
                  aria-label={section.visible ? "Hide section" : "Show section"}
                  onClick={() => patch(section.id, (s) => ({ ...s, visible: !s.visible }))}
                  className="ml-auto text-text-faint hover:text-text focus-ring"
                >
                  {section.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  type="button"
                  aria-label="Delete section"
                  onClick={() => {
                    setSaved(false);
                    setSections((prev) => prev.filter((s) => s.id !== section.id));
                  }}
                  className="text-text-faint hover:text-[var(--down)] focus-ring"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className={cn("mt-3", !section.visible && "opacity-50")}>
                {section.type === "richText" && (
                  <div className="flex flex-col gap-2">
                    <input
                      value={String(section.data?.title ?? "")}
                      onChange={(e) =>
                        patch(section.id, (s) => ({
                          ...s,
                          data: { ...s.data, title: e.target.value },
                        }))
                      }
                      placeholder="Section title (optional)"
                      className={inputClass}
                    />
                    <textarea
                      value={String(section.data?.body ?? "")}
                      onChange={(e) =>
                        patch(section.id, (s) => ({
                          ...s,
                          data: { ...s.data, body: e.target.value },
                        }))
                      }
                      placeholder="Write about your process, coverage, or background..."
                      rows={4}
                      className={cn(inputClass, "resize-y")}
                    />
                  </div>
                )}

                {section.type === "faq" && (
                  <FaqEditor
                    items={(Array.isArray(section.data?.items) ? section.data.items : []) as FaqItem[]}
                    onChange={(items) =>
                      patch(section.id, (s) => ({ ...s, data: { ...s.data, items } }))
                    }
                  />
                )}

                {section.type === "featuredReport" && (
                  <select
                    value={String(section.data?.reportId ?? "")}
                    onChange={(e) =>
                      patch(section.id, (s) => ({
                        ...s,
                        data: { ...s.data, reportId: e.target.value },
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Pick a published report</option>
                    {reports.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title ?? "Untitled"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save sections"}
        </Button>
        {saved && !pending && (
          <span className="flex items-center gap-1 text-sm text-[var(--up)]">
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}

function FaqEditor({ items, onChange }: { items: FaqItem[]; onChange: (items: FaqItem[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded-[var(--radius-btn)] border border-border p-3">
          <div className="flex items-center gap-2">
            <input
              value={item.q}
              onChange={(e) => onChange(items.map((x, xi) => (xi === i ? { ...x, q: e.target.value } : x)))}
              placeholder="Question"
              className={inputClass}
            />
            <button
              type="button"
              aria-label="Remove question"
              onClick={() => onChange(items.filter((_, xi) => xi !== i))}
              className="text-text-faint hover:text-[var(--down)] focus-ring"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <textarea
            value={item.a}
            onChange={(e) => onChange(items.map((x, xi) => (xi === i ? { ...x, a: e.target.value } : x)))}
            placeholder="Answer"
            rows={2}
            className={cn(inputClass, "resize-y")}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { q: "", a: "" }])}
        className="flex items-center gap-1.5 self-start text-[12px] text-text-mute hover:text-text focus-ring"
      >
        <Plus size={13} /> Add question
      </button>
    </div>
  );
}
