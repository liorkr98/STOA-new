"use client";

import Link from "next/link";
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
import { DotsSixVertical, Plus, Trash, PushPin } from "@phosphor-icons/react";
import { saveBrandingStudio, setPinnedProfileReport } from "@/app/actions/profile";
import type { ProfileConfig, ProfileSection } from "@/lib/editor/types";
import type { Profile, Report } from "@/lib/types";
import type { Plan } from "@/lib/db/plans";
import { PROFILE_THEMES } from "@/lib/profile/themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { CoverUpload } from "@/components/profile/cover-upload";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { BrandAnalyzerPanel } from "@/components/profile/brand-analyzer-panel";
import { PricingPanel } from "@/components/profile/pricing-panel";
import { AccentPicker } from "@/components/profile/accent-picker";
import { StorefrontSectionsEditor } from "@/components/profile/storefront-sections-editor";
import { PlanManager } from "@/components/profile/plan-manager";
import type { BrandSuggestion } from "@/lib/profile/brand-analyze";

const DEFAULT_SECTIONS: ProfileSection[] = [
  { id: "headline", type: "headline", visible: true },
  { id: "bio", type: "bio", visible: true },
  { id: "specialties", type: "specialties", visible: true },
  { id: "social", type: "social", visible: false },
  { id: "featured", type: "featured", visible: false },
];

type Tab = "identity" | "style" | "sections" | "pricing" | "ai";
const TABS: [Tab, string][] = [
  ["identity", "Identity"],
  ["style", "Style"],
  ["sections", "Sections"],
  ["pricing", "Pricing & tiers"],
  ["ai", "AI analyzer"],
];

const inputClass = "mt-1 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm";

function SortableSection({ section, onToggle }: { section: ProfileSection; onToggle: () => void }) {
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
  aiCredits,
  publishedReports,
  plans,
}: {
  profile: Profile;
  aiCredits: number;
  publishedReports: Report[];
  plans: Plan[];
}) {
  const initial = profile.profile_config ?? {};
  const [tab, setTab] = useState<Tab>("identity");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
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
  const [pinnedId, setPinnedId] = useState<string | null>(initial.pinned_report_id ?? null);
  const [credits, setCredits] = useState(aiCredits);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [, startPin] = useTransition();

  const theme = PROFILE_THEMES.find((t) => t.id === themeId) ?? PROFILE_THEMES[0];
  const draftConfig: ProfileConfig = {
    theme_id: theme.id,
    banner_style: theme.banner_style,
    sections,
    specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
    social: social.filter((s) => s.label.trim() && s.url.trim()),
    featured_tickers: tickers.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    pinned_report_id: pinnedId,
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
      await saveBrandingStudio({ display_name: displayName, headline, bio, profile_config: draftConfig });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  // Same setting the Publications "Pin to profile" action writes -- one source of truth.
  function pin(id: string | null) {
    setPinnedId(id);
    startPin(async () => {
      await setPinnedProfileReport(id);
    });
  }

  function applySuggestion(field: BrandSuggestion["field"], value: string | string[]) {
    if (field === "headline" && typeof value === "string") setHeadline(value);
    if (field === "bio" && typeof value === "string") setBio(value.slice(0, 500));
    if (field === "specialties" && Array.isArray(value)) setSpecialties(value.join(", "));
    if (field === "social" && Array.isArray(value)) {
      setSocial(
        value.map((url) => {
          try {
            return { label: new URL(url).hostname.replace("www.", ""), url };
          } catch {
            return { label: "Link", url };
          }
        }),
      );
      setSections(sections.map((s) => (s.type === "social" ? { ...s, visible: true } : s)));
    }
  }

  const brandingTab = tab === "identity" || tab === "style" || tab === "sections";

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-border">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "num relative shrink-0 whitespace-nowrap pb-3 text-[11px] uppercase tracking-[0.16em] transition-colors",
                tab === key ? "text-text" : "text-text-mute hover:text-text",
              )}
            >
              {label}
              {tab === key && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--ink)]" />}
            </button>
          ))}
        </div>

        {/* IDENTITY */}
        {tab === "identity" && (
          <div className="surface flex flex-col gap-6 p-6">
            <AvatarUpload userId={profile.id} displayName={displayName} currentUrl={avatarUrl} onUploaded={setAvatarUrl} />
            <CoverUpload
              userId={profile.id}
              currentUrl={coverUrl}
              bannerStyle={theme.banner_style}
              onUploaded={setCoverUrl}
              onUseCoverTheme={() => setThemeId("cover")}
            />
            <label className="text-sm">
              Display name
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm">
              Headline
              <input value={headline} onChange={(e) => setHeadline(e.target.value.slice(0, 160))} placeholder="One line on your edge" className={inputClass} />
            </label>
            <label className="text-sm">
              Bio
              <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} rows={3} className={cn(inputClass, "resize-y")} />
            </label>
            <label className="text-sm">
              Specialties (comma-separated)
              <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} className={inputClass} />
            </label>

            <label className="text-sm">
              Featured tickers
              <input value={tickers} onChange={(e) => setTickers(e.target.value.toUpperCase())} placeholder="NVDA, AMD, TSM" className={inputClass} />
            </label>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Social links</p>
                <button type="button" onClick={() => setSocial([...social, { label: "Link", url: "" }])} className="flex items-center gap-1 text-xs text-accent">
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {social.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={row.label} onChange={(e) => { const n = [...social]; n[i] = { ...row, label: e.target.value }; setSocial(n); }} placeholder="Label" className="w-28 rounded-[var(--radius-btn)] border border-border bg-bg px-2 py-1.5 text-sm" />
                    <input value={row.url} onChange={(e) => { const n = [...social]; n[i] = { ...row, url: e.target.value }; setSocial(n); }} placeholder="https://" className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-border bg-bg px-2 py-1.5 text-sm" />
                    <button type="button" aria-label="Remove link" onClick={() => setSocial(social.filter((_, j) => j !== i))} className="text-text-faint hover:text-[var(--down)]">
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pinned video */}
            <div>
              <p className="text-sm font-medium">Pinned video</p>
              <p className="t-meta mt-1">Shown at the top of your public profile. Also settable from Publications.</p>
              <div className="mt-2 flex flex-col gap-1.5">
                <button type="button" onClick={() => pin(null)} className={cn("flex items-center justify-between rounded-[var(--radius-btn)] border px-3 py-2 text-left text-sm", pinnedId === null ? "border-[var(--ink)]" : "border-border hover:border-border-strong")}>
                  <span>Most recent (default)</span>
                  {pinnedId === null && <PushPin size={14} weight="fill" />}
                </button>
                {publishedReports.slice(0, 6).map((r) => (
                  <button key={r.id} type="button" onClick={() => pin(r.id)} className={cn("flex items-center justify-between gap-3 rounded-[var(--radius-btn)] border px-3 py-2 text-left text-sm", pinnedId === r.id ? "border-[var(--ink)]" : "border-border hover:border-border-strong")}>
                    <span className="truncate">{r.title ?? "Untitled"}</span>
                    {pinnedId === r.id && <PushPin size={14} weight="fill" className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm">
              <span className="text-text-mute">Handle: </span>
              <span className="num">@{profile.handle}</span>
              <span className="num ml-2 text-[10px] uppercase tracking-[0.14em] text-text-faint">Locked after onboarding</span>
            </div>
          </div>
        )}

        {/* STYLE */}
        {tab === "style" && (
          <div className="flex flex-col gap-6">
            <div className="surface p-6">
              <p className="text-sm font-medium">Theme</p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PROFILE_THEMES.map((t) => (
                  <button key={t.id} type="button" onClick={() => setThemeId(t.id)} className={cn("overflow-hidden rounded-[var(--radius-btn)] border p-2 text-left text-[10px] font-medium transition-colors", themeId === t.id ? "border-accent text-accent" : "border-border text-text-mute")}>
                    <div className={cn("mb-1.5 h-6 w-full rounded-[4px]", t.className || "bg-muted")} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <AccentPicker
              initialAccent={initial.accent ?? null}
              initialFontPairing={initial.font_pairing ?? null}
              initialLayout={initial.layout ?? null}
              initialTexture={initial.texture ?? false}
            />
          </div>
        )}

        {/* SECTIONS */}
        {tab === "sections" && (
          <div className="flex flex-col gap-6">
            <div className="surface p-6">
              <h3 className="text-sm font-medium">Section order</h3>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="mt-2 flex flex-col gap-2">
                    {sections.map((s) => (
                      <SortableSection key={s.id} section={s} onToggle={() => setSections(sections.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)))} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            <StorefrontSectionsEditor
              initialSections={initial.storefront_sections ?? []}
              reports={publishedReports.map((r) => ({ id: r.id, title: r.title }))}
            />
          </div>
        )}

        {/* PRICING & TIERS */}
        {tab === "pricing" && (
          <div className="flex flex-col gap-6">
            <PlanManager initialPlans={plans} handle={profile.handle} />
            <div className="rounded-[var(--radius-card)] border border-border bg-surface-2 p-5">
              <p className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">Legacy pricing — being retired</p>
              <p className="t-meta mt-1">
                These single-price fields predate tiers. Kept working for now; tiers above are the primary control.
              </p>
              <div className="mt-4">
                <PricingPanel subPrice={profile.sub_price} reportPrice={profile.report_price} />
              </div>
            </div>
          </div>
        )}

        {/* AI ANALYZER */}
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

        {/* Persistent save for branding-managed fields (identity/style/sections). */}
        {brandingTab && (
          <div className="flex items-center gap-3">
            <Button type="button" disabled={pending} onClick={save}>
              {pending ? "Saving..." : "Save branding"}
            </Button>
            {saved && <span className="text-sm text-[var(--up)]">Saved</span>}
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="flex flex-col gap-3 xl:sticky xl:top-20 xl:self-start">
        <div className="flex items-center justify-between">
          <div className="num flex gap-1 text-[10px] uppercase tracking-[0.14em]">
            {(["desktop", "mobile"] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} className={cn("rounded-full border px-2.5 py-1", device === d ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-border text-text-mute")}>
                {d}
              </button>
            ))}
          </div>
          <Link href={`/analyst/${profile.handle}`} className="num text-[10px] uppercase tracking-[0.14em] text-text hover:text-text-mute">
            View my public profile →
          </Link>
        </div>
        <div className={device === "mobile" ? "mx-auto w-full max-w-[390px]" : "w-full"}>
          <ProfilePreview
            profile={profile}
            draft={{ display_name: displayName, headline, bio, avatar_url: avatarUrl, cover_url: coverUrl, config: draftConfig }}
          />
        </div>
      </div>
    </div>
  );
}
