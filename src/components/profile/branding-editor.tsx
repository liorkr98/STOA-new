"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical, Sparkle } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/design/cn";
import type { ProfileConfig, ProfileSection } from "@/lib/editor/types";
import { updateProfileConfig } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

const DEFAULT_SECTIONS: ProfileSection[] = [
  { id: "headline", type: "headline", visible: true },
  { id: "bio", type: "bio", visible: true },
  { id: "specialties", type: "specialties", visible: true },
  { id: "social", type: "social", visible: false },
];

function SortableSection({
  section,
  onToggle,
}: {
  section: ProfileSection;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: section.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass flex items-center justify-between gap-3 rounded-[var(--radius-btn)] px-3 py-2.5"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab text-text-faint hover:text-text"
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical size={18} />
        </button>
        <span className="text-sm capitalize">{section.type}</span>
      </div>
      <label className="flex items-center gap-2 text-xs text-text-mute">
        <input type="checkbox" checked={section.visible} onChange={onToggle} />
        Visible
      </label>
    </div>
  );
}

export function BrandingEditor({ profile }: { profile: Profile }) {
  const config = profile.profile_config ?? {};
  const [sections, setSections] = useState<ProfileSection[]>(
    config.sections?.length ? config.sections : DEFAULT_SECTIONS,
  );
  const [bannerStyle, setBannerStyle] = useState<NonNullable<ProfileConfig["banner_style"]>>(
    config.banner_style ?? "gradient-accent",
  );
  const [specialties, setSpecialties] = useState(
    (config.specialties ?? []).join(", "),
  );
  const [pending, start] = useTransition();
  const [aiHint, setAiHint] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const next = [...sections];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    setSections(next);
  }

  function save() {
    const next: ProfileConfig = {
      banner_style: bannerStyle as ProfileConfig["banner_style"],
      sections,
      specialties: specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    start(async () => {
      await updateProfileConfig(next);
    });
  }

  async function aiBio() {
    setAiHint("Generating...");
    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Write a 2-sentence analyst bio for ${profile.display_name} covering: ${specialties || "equity research"}. Professional, no hype.`,
            },
          ],
          context: { type: "profile" },
        }),
      });
      const data = (await res.json()) as { reply?: string };
      setAiHint(data.reply ?? "Could not generate.");
    } catch {
      setAiHint("AI unavailable.");
    }
  }

  return (
    <div className="observatory flex flex-col gap-6 rounded-[var(--radius-card)] border border-border bg-bg p-6">
      <div>
        <h2 className="t-h3">Profile layout</h2>
        <p className="t-meta mt-1">Drag sections to reorder what visitors see on your public profile.</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {sections.map((s) => (
              <SortableSection
                key={s.id}
                section={s}
                onToggle={() =>
                  setSections(sections.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)))
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Banner style
          <select
            value={bannerStyle}
            onChange={(e) =>
              setBannerStyle(e.target.value as NonNullable<ProfileConfig["banner_style"]>)
            }
            className="mt-1 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm"
          >
            <option value="gradient-accent">Signal gradient</option>
            <option value="gradient-cool">Cool gradient</option>
            <option value="minimal">Minimal</option>
            <option value="cover">Cover image</option>
          </select>
        </label>
        <label className="text-sm">
          Specialties (comma-separated)
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="Semiconductors, AI, Macro"
            className="mt-1 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => void aiBio()}>
          <Sparkle size={16} className="text-accent" />
          AI bio suggestion
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "Saving..." : "Save branding"}
        </Button>
      </div>

      {aiHint && (
        <div className="glass rounded-[var(--radius-btn)] p-4 text-sm text-text-mute">{aiHint}</div>
      )}
    </div>
  );
}
