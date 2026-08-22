import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import { getWallet } from "@/lib/db/wallet";
import { listActiveBoosts } from "@/lib/db/boosts";
import { usd } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Boost" };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="num border-b border-[var(--ink)] pb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">
      {children}
    </div>
  );
}

// Placeholder package pricing until a boost-pricing config exists in the backend.
const PACKAGES = [
  { key: "profile-24", kind: "PROFILE", duration: "24 HOURS", price: 10, desc: "Your profile featured for a day." },
  { key: "profile-7", kind: "PROFILE", duration: "7 DAYS", price: 50, desc: "Your profile featured for a week." },
  { key: "report-24", kind: "REPORT", duration: "24 HOURS", price: 8, desc: "One publication promoted for a day." },
  { key: "report-7", kind: "REPORT", duration: "7 DAYS", price: 40, desc: "One publication promoted for a week." },
];

export default async function BoostPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  const [wallet, active] = await Promise.all([getWallet(profile.id), listActiveBoosts(profile.id)]);

  return (
    <div className="mx-auto flex max-w-[var(--w-reading)] flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Boost</h1>
        <p className="t-body mt-2">Paid placement, always labelled.</p>
      </div>

      <p className="t-body max-w-2xl text-text-mute">
        Boost puts your profile or a single publication in front of more investors for a set
        window. Pick a package below.
      </p>
      <p className="num text-[11px] uppercase tracking-[0.14em] text-text-mute">
        Wallet balance · {usd(wallet?.balance ?? 0, { cents: true })}
      </p>

      {/* Packages */}
      <div className="grid gap-3 sm:grid-cols-2">
        {PACKAGES.map((p) => (
          <div key={p.key} className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <div className="num text-[11px] uppercase tracking-[0.18em] text-text-mute">
              {p.kind} · {p.duration}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">${p.price}</div>
            <p className="t-body mt-2 flex-1 text-sm">{p.desc}</p>
            <button type="button" disabled className={buttonClass("secondary", "sm", "mt-4")}>
              Boost
            </button>
          </div>
        ))}
      </div>

      {/* Active boosts */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Active boosts</SectionLabel>
        {active.length === 0 ? (
          <p className="t-meta">No active boosts.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((b) => (
              <div key={b.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="num text-[11px] uppercase tracking-[0.16em] text-text-mute">
                    {b.target_type} · {b.placement}
                  </span>
                  <span className="num text-[11px] uppercase tracking-[0.14em] text-text-faint">
                    {formatDistanceToNowStrict(new Date(b.ends_at))} left
                  </span>
                </div>
                {/* Live stats are not tracked in the backend yet -- placeholder. */}
                <div className="num mt-3 flex gap-6 text-[12px] text-text-faint">
                  <span>— IMPRESSIONS</span>
                  <span>— CLICKS</span>
                  <span>— NEW FOLLOWERS</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History (placeholder) */}
      <section className="flex flex-col gap-4">
        <SectionLabel>History</SectionLabel>
        <p className="t-meta">
          Boost history (date · type · spend · impressions · result) will appear here once boost analytics are stored.
        </p>
      </section>

      <p className="num rounded-[var(--radius-card)] border border-border bg-surface-2 p-4 text-[11px] leading-relaxed tracking-[0.04em] text-text-mute">
        Boosted content is labelled &quot;Promoted&quot; wherever it appears. Boosts never change your Track Score
        or where your calls rank on merit.
      </p>
    </div>
  );
}
