"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pin } from "lucide-react";
import { saveBrandingStudio, setPinnedProfileReport } from "@/app/actions/profile";
import type { Profile, Report } from "@/lib/types";
import type { Plan } from "@/lib/db/plans";
import { cn } from "@/lib/design/cn";
import { Avatar } from "@/components/ui/avatar";
import { ScrollFrame } from "@/components/layout/scroll-frame";
import { CoverUpload } from "@/components/profile/cover-upload";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { PricingPanel } from "@/components/profile/pricing-panel";
import { StorefrontStyle } from "@/components/profile/storefront-style";
import { PlanManager } from "@/components/profile/plan-manager";

/**
 * The Storefront editor. It offers only what the public profile shows: the
 * identity (edited in Settings, shown here), the picture a shared link
 * carries, the pinned publication, whether the member count shows, the
 * headline face and texture, and pricing. Specialties, featured tickers,
 * social links, section order, colour themes, the accent colour, a report
 * layout and the AI brand analyzer were removed on 2026-09-27: the
 * storefront rebuild shows none of them, and filling in something that never
 * appears is worse than not being asked.
 */

type Tab = "profile" | "style" | "pricing";
const TABS: [Tab, string][] = [
  ["profile", "Profile"],
  ["style", "Style"],
  ["pricing", "Pricing & tiers"],
];

export function BrandingStudio({
  profile,
  publishedReports,
  plans,
}: {
  profile: Profile;
  publishedReports: Report[];
  plans: Plan[];
}) {
  const initial = profile.profile_config ?? {};
  const [tab, setTab] = useState<Tab>("profile");
  const [coverUrl, setCoverUrl] = useState(profile.cover_url);
  const [pinnedId, setPinnedId] = useState<string | null>(initial.pinned_report_id ?? null);
  const [showMembers, setShowMembers] = useState(initial.show_member_count ?? false);
  const [, startSave] = useTransition();

  // Same setting the Publications "Pin to profile" action writes: one source of truth.
  function pin(id: string | null) {
    setPinnedId(id);
    startSave(async () => {
      await setPinnedProfileReport(id);
    });
  }

  function toggleMembers(next: boolean) {
    setShowMembers(next);
    startSave(async () => {
      await saveBrandingStudio({ profile_config: { show_member_count: next } });
    });
  }

  const row = (active: boolean) =>
    cn(
      "flex items-center justify-between gap-3 rounded-inner border px-3 py-2 text-left text-body",
      active ? "border-[var(--ink)]" : "border-border hover:border-border-strong",
    );

  return (
    /* A frame that fills the room under the page heading. Above xl the form
       and the live preview are two columns that scroll on their own; below
       it the frame is the scroller and they stack. */
    <ScrollFrame className="scroll-area flex-col gap-8 overflow-y-auto pb-[calc(var(--tab-h)+var(--main-pad-y))] xl:flex-row xl:overflow-hidden xl:pb-0">
      <div className="scroll-area flex flex-col gap-6 xl:min-h-0 xl:min-w-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
        <div role="tablist" className="flex shrink-0 gap-1.5 overflow-x-auto">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-button px-3.5 py-1.5 text-body font-medium transition-colors focus-ring",
                tab === key ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div className="surface flex flex-col gap-8 p-6">
            {/* Name, photo, headline and bio are account identity: shown here, edited in
                Settings, so the two surfaces never fight over the same record. */}
            <section className="flex flex-col gap-4 rounded-inner bg-surface-2 p-5">
              <div className="flex items-center gap-4">
                <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />
                <div className="min-w-0">
                  <p className="text-body font-semibold text-text">{profile.display_name}</p>
                  <p className="t-meta">@{profile.handle} · your handle cannot change</p>
                </div>
              </div>
              <div>
                <p className="t-meta">What you cover</p>
                <p className="mt-1 text-body text-text">{profile.headline || "Not set"}</p>
              </div>
              <div>
                <p className="t-meta">Bio</p>
                <p className="mt-1 whitespace-pre-line text-body text-text-mute">{profile.bio || "Not set"}</p>
              </div>
              <Link href="/settings" className="focus-ring w-fit rounded-inner text-body font-medium text-text underline">
                Edit your name, photo, headline and bio in Settings
              </Link>
            </section>

            <section>
              <h2 className="t-title">Pinned publication</h2>
              <p className="t-meta mt-1">Leads your profile in place of your latest. Also settable from Publications.</p>
              <div className="mt-3 flex flex-col gap-1.5">
                <button type="button" onClick={() => pin(null)} className={row(pinnedId === null)}>
                  <span>Your latest publication</span>
                  {pinnedId === null ? <Pin size={14} aria-hidden /> : null}
                </button>
                {publishedReports.slice(0, 6).map((r) => (
                  <button key={r.id} type="button" onClick={() => pin(r.id)} className={row(pinnedId === r.id)}>
                    <span className="truncate">{r.title ?? "Untitled"}</span>
                    {pinnedId === r.id ? <Pin size={14} aria-hidden className="shrink-0" /> : null}
                  </button>
                ))}
              </div>
            </section>

            {/* Followers always show; the member count is the analyst's call, since a
                small paying audience should not be a public number unless they want it. */}
            <section>
              <h2 className="t-title">Audience line</h2>
              <p className="t-meta mt-1">Your profile shows your followers. You can add your paying members beside them.</p>
              <label className="mt-3 flex items-center gap-2 text-body">
                <input type="checkbox" checked={showMembers} onChange={(e) => toggleMembers(e.target.checked)} />
                Show my member count
              </label>
            </section>

            <section>
              <h2 className="t-title">Share image</h2>
              <p className="t-meta mt-1 mb-3">The picture a link to your profile carries when it is shared. Without one, your photo is used.</p>
              <CoverUpload userId={profile.id} currentUrl={coverUrl} onUploaded={setCoverUrl} />
            </section>
          </div>
        )}

        {tab === "style" && (
          <StorefrontStyle initialFontPairing={initial.font_pairing ?? null} initialTexture={initial.texture ?? false} />
        )}

        {tab === "pricing" && (
          <div className="flex flex-col gap-6">
            <PlanManager initialPlans={plans} handle={profile.handle} />
            <div className="rounded-panel bg-surface-2 p-5">
              <p className="t-meta">Single prices, being retired</p>
              <p className="t-meta mt-1">
                These single-price fields predate tiers. Kept working for now; tiers above are the primary control.
              </p>
              <div className="mt-4">
                <PricingPanel subPrice={profile.sub_price} reportPrice={profile.report_price} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="scroll-area flex flex-col gap-3 xl:min-h-0 xl:w-[360px] xl:shrink-0 xl:overflow-y-auto">
        <Link href={`/analyst/${profile.handle}`} className="focus-ring w-fit rounded-inner text-body font-medium text-text hover:text-text-mute">
          View my public profile →
        </Link>
        <ProfilePreview
          profile={profile}
          draft={{
            display_name: profile.display_name,
            headline: profile.headline ?? "",
            bio: profile.bio ?? "",
            avatar_url: profile.avatar_url,
            cover_url: coverUrl,
          }}
        />
      </div>
    </ScrollFrame>
  );
}
