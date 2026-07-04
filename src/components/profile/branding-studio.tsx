"use client";

import { useState, useTransition } from "react";
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
import { DotsSixVertical, Plus, Trash } from "@phosphor-icons/react";
import { saveBrandingStudio } from "@/app/actions/profile";
import type { ProfileConfig, ProfileSection } from "@/lib/editor/types";
import type { Profile, Report } from "@/lib/types";
import { PROFILE_THEMES } from "@/lib/profile/themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { CoverUpload } from "@/components/profile/cover-upload";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { BrandAnalyzerPanel } from "@/components/profile/brand-analyzer-panel";
import { BoostPanel } from "@/components/profile/boost-panel";
import type { BrandSuggestion } from "@/lib/profile/brand-analyze";
import type { ProfileBoost } from "@/lib/db/boosts";

const DEFAULT_SECTIONS: ProfileSection[] = [
  { id: "headline", type: "headline", visible: true },
  { id: "bio", type: "bio", visible: true },
  { id: "specialties", type: "specialties", visible: true },
  { id: "social", type: "social", visible: false },
  { id: "featured", type: "featured", visible: false },
];

type Tab = "brand" | "ai" | "boost";

function SortableSection({
  section,
  onToggle,
}: {
  section: ProfileSection;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center justify-between gap-3 rounded-[var(--radius-btn)] border border-border bg-surface-2 px-3 py-2.5"
    >
      <div className="flex items-center gap-2">
        <button type="button" className="cursor-grab text-text-faint hover:text-text" {...attributes} {...listeners}>
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

export function BrandingStudio({
  profile,
  walletBalance,
  aiCredits,
  activeBoosts,
  publishedReports,
}: {
  profile: Profile;
  walletBalance: number;
  aiCredits: number;
  activeBoosts: ProfileBoost[];
  publishedReports: Report[];
}) {
  const initial = profile.profile_config ?? {};
  const [tab, setTab] = useState<Tab>("brand");
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [coverUrl, setCoverUrl] = useState(profile.cover_url);
  const [themeId, setThemeId] = useState(initial.theme_id ?? "signal");
  const [sections, setSections] = useState<ProfileSection[]>(
    initial.sections?.length ? initial.sections : DEFAULT_SECTIONS,
  );
  const [specialties, setSpecialties] = useState((initial.specialties ?? []).join(", "));
  const [social, setSocial] = useState<{ label: string; url: string }[]>(initial.social ?? []);
  const [tickers, setTickers] = useState((initial.featured_tickers ?? []).join(", "));
  const [credits, setCredits] = useState(aiCredits);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const theme = PROFILE_THEMES.find((t) => t.id === themeId) ?? PROFILE_THEMES[0];
  const draftConfig: ProfileConfig = {
    theme_id: theme.id,
    banner_style: theme.banner_style,
    sections,
    specialties: specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    social: social.filter((s) => s.label.trim() && s.url.trim()),
    featured_tickers: tickers
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  };

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
    setSaved(false);
    start(async () => {
      await saveBrandingStudio({
        display_name: displayName,
        headline,
        bio,
        profile_config: draftConfig,
      });
      setSaved(true);
    });
  }

  function applySuggestion(field: BrandSuggestion["field"], value: string | string[]) {
    if (field === "headline" && typeof value === "string") setHeadline(value);
    if (field === "bio" && typeof value === "string") setBio(value.slice(0, 500));
    if (field === "specialties" && Array.isArray(value)) setSpecialties(value.join(", "));
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["brand", "Brand"],
              ["ai", "AI analyzer"],
              ["boost", "Boost"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-[var(--radius-btn)] px-3 py-1.5 text-sm font-medium transition-colors",
                tab === key ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:bg-surface-2",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "brand" && (
          <div className="surface flex flex-col gap-6 p-6">
            <div>
              <h2 className="t-h3">Identity</h2>
              <p className="t-meta mt-1">@{profile.handle} is locked after onboarding.</p>
            </div>

            <AvatarUpload
              userId={profile.id}
              displayName={displayName}
              currentUrl={avatarUrl}
              onUploaded={setAvatarUrl}
            />

            <CoverUpload
              userId={profile.id}
              currentUrl={coverUrl}
              bannerStyle={theme.banner_style}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Display name
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Headline
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value.slice(0, 160))}
                  placeholder="One line on your edge"
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Bio
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div>
              <p className="text-sm font-medium">Theme</p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PROFILE_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeId(t.id)}
                    className={cn(
                      "overflow-hidden rounded-[var(--radius-btn)] border p-2 text-left text-[10px] font-medium transition-colors",
                      themeId === t.id ? "border-accent text-accent" : "border-border text-text-mute",
                    )}
                  >
                    <div className={cn("mb-1.5 h-6 w-full rounded-[4px]", t.className || "bg-muted")} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium">Section order</h3>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="mt-2 flex flex-col gap-2">
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
            </div>

            <label className="text-sm">
              Specialties (comma-separated)
              <input
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm">
              Featured tickers
              <input
                value={tickers}
                onChange={(e) => setTickers(e.target.value.toUpperCase())}
                placeholder="NVDA, AMD, TSM"
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm"
              />
            </label>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Social links</p>
                <button
                  type="button"
                  onClick={() => setSocial([...social, { label: "Link", url: "" }])}
                  className="flex items-center gap-1 text-xs text-accent"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {social.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={row.label}
                      onChange={(e) => {
                        const next = [...social];
                        next[i] = { ...row, label: e.target.value };
                        setSocial(next);
                      }}
                      placeholder="Label"
                      className="w-28 rounded-[var(--radius-btn)] border border-border bg-bg px-2 py-1.5 text-sm"
                    />
                    <input
                      value={row.url}
                      onChange={(e) => {
                        const next = [...social];
                        next[i] = { ...row, url: e.target.value };
                        setSocial(next);
                      }}
                      placeholder="https://"
                      className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-border bg-bg px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      aria-label="Remove link"
                      onClick={() => setSocial(social.filter((_, j) => j !== i))}
                      className="text-text-faint hover:text-[var(--down)]"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" disabled={pending} onClick={save}>
                {pending ? "Saving..." : "Save branding"}
              </Button>
              {saved && <span className="text-sm text-[var(--up)]">Saved</span>}
            </div>
          </div>
        )}

        {tab === "ai" && (
          <BrandAnalyzerPanel
            credits={credits}
            onCreditsChange={setCredits}
            input={{
              display_name: displayName,
              headline: headline || null,
              bio: bio || null,
              specialties: draftConfig.specialties ?? [],
              social: draftConfig.social ?? [],
            }}
            onApply={applySuggestion}
          />
        )}

        {tab === "boost" && (
          <BoostPanel
            walletBalance={walletBalance}
            activeBoosts={activeBoosts}
            reports={publishedReports}
          />
        )}
      </div>

      <ProfilePreview
        profile={profile}
        draft={{
          display_name: displayName,
          headline,
          bio,
          avatar_url: avatarUrl,
          cover_url: coverUrl,
          config: draftConfig,
        }}
      />
    </div>
  );
}
