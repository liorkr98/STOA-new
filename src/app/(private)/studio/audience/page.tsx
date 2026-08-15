import type { Metadata } from "next";
import { headers } from "next/headers";
import { format, isThisMonth } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import { countReferrals } from "@/lib/db/profiles";
import { listAnalystSubscribers } from "@/lib/db/subscriptions";
import { subscriberCount } from "@/lib/db/social";
import { compact } from "@/lib/format";
import { CopyButton } from "@/components/ui/copy-button";
import { SubscriberTable, type SubscriberRowVM } from "@/components/studio/subscriber-table";

export const metadata: Metadata = { title: "Audience" };

function initialsOf(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="num border-b border-[var(--ink)] pb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">
      {children}
    </div>
  );
}

export default async function StudioAudiencePage() {
  const profile = (await getSessionProfile())!;
  const [subs, count, referralCount] = await Promise.all([
    listAnalystSubscribers(profile.id),
    subscriberCount(profile.id),
    countReferrals(profile.id),
  ]);
  const host = (await headers()).get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const referralLink = host ? `${protocol}://${host}/sign-up?ref=${profile.handle}` : `/sign-up?ref=${profile.handle}`;

  const newThisMonth = subs.filter((s) => isThisMonth(new Date(s.started_at))).length;

  const rows: SubscriberRowVM[] = subs.map((s) => {
    const name = s.subscriber?.display_name ?? "Subscriber";
    const cancelling = s.status === "cancelled";
    return {
      id: s.subscriber_id,
      name,
      initials: initialsOf(name),
      tier: "—", // no tier name on subscriptions yet (placeholder)
      joined: format(new Date(s.started_at), "MMM d, yyyy"),
      statusLabel: cancelling ? `Cancelling · until ${format(new Date(s.renews_at), "MMM d")}` : "Active",
      statusTone: cancelling ? "muted" : "active",
    };
  });

  const metrics = [
    { label: "Subscribers", value: compact(count) },
    { label: "Followers", value: compact(profile.followers_count) },
    { label: "Referral signups", value: compact(referralCount) },
    { label: "Monthly sub price", value: profile.sub_price ? `$${profile.sub_price}` : "Not set" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Audience</h1>
        <p className="t-body mt-2">Who&apos;s reading, and who&apos;s paying.</p>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-[var(--radius-card)] bg-surface-2 px-5 py-4">
            <div className="num text-[10.5px] uppercase tracking-[0.18em] text-text-mute">{m.label}</div>
            <div className="mt-2.5 text-[24px] font-semibold tracking-tight">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Growth (chart is a placeholder -- no subscriber time series stored yet) */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <SectionLabel>Growth</SectionLabel>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="num flex gap-2 text-[10px] uppercase tracking-[0.14em] text-text-faint">
              <span className="rounded-full border border-[var(--ink)] px-2.5 py-1 text-text">30D</span>
              <span className="rounded-full border border-border px-2.5 py-1">90D</span>
              <span className="rounded-full border border-border px-2.5 py-1">1Y</span>
            </div>
            <span className="num text-[11px] uppercase tracking-[0.14em] text-[var(--verdigris)]">
              +{newThisMonth} this month
            </span>
          </div>
          <div className="mt-4 flex h-32 items-center justify-center rounded-[var(--radius-btn)] border border-dashed border-border">
            <p className="t-meta">Subscriber growth over time — not stored yet.</p>
          </div>
        </div>
      </section>

      {/* Referral link */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Referral link</SectionLabel>
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:flex-row sm:items-center">
          <code className="num min-w-0 flex-1 overflow-x-auto rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm">
            {referralLink}
          </code>
          <CopyButton value={referralLink} label="Copy" />
        </div>
        <p className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Signups attributed to you are counted above.
        </p>
      </section>

      {/* Subscribers */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Subscribers</SectionLabel>
        {rows.length === 0 ? (
          <p className="t-meta">No subscribers yet.</p>
        ) : (
          <SubscriberTable rows={rows} />
        )}
      </section>
    </div>
  );
}
