import Link from "next/link";
import type { Metadata } from "next";
import { isThisMonth } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import { getWallet, listTransactions } from "@/lib/db/wallet";
import { usd } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Earnings" };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="num border-b border-[var(--ink)] pb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">
      {children}
    </div>
  );
}

export default async function EarningsPage() {
  const profile = (await getSessionProfile())!;
  const [wallet, txns] = await Promise.all([getWallet(profile.id), listTransactions(profile.id)]);

  const net = wallet?.earnings ?? 0; // lifetime net, in cents
  const gross = net / 0.9;
  const fee = gross - net;

  const revenue = txns.filter((t) => t.amount > 0 && (t.type === "subscription" || t.type === "report_unlock"));
  const subRevenue = revenue.filter((t) => t.type === "subscription").reduce((s, t) => s + t.amount, 0);
  const unlockRevenue = revenue.filter((t) => t.type === "report_unlock").reduce((s, t) => s + t.amount, 0);
  const totalRevenue = subRevenue + unlockRevenue || 1;
  const thisMonth = revenue.filter((t) => isThisMonth(new Date(t.created_at))).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Earnings</h1>
        <p className="t-body mt-2">What you&apos;ve made, and what&apos;s coming.</p>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3.5">
        {[
          { label: "This month", value: usd(thisMonth, { cents: true }) },
          { label: "Lifetime", value: usd(net, { cents: true }) },
          { label: "Pending payout", value: usd(net, { cents: true }) },
        ].map((m) => (
          <div key={m.label} className="rounded-[var(--radius-card)] bg-surface-2 px-5 py-4">
            <div className="num text-[11px] uppercase tracking-[0.18em] text-text-mute">{m.label}</div>
            <div className="mt-2.5 text-[26px] font-semibold tracking-tight">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue breakdown */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Revenue breakdown</SectionLabel>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
          <div style={{ width: `${(subRevenue / totalRevenue) * 100}%`, background: "var(--ink)" }} />
          <div style={{ width: `${(unlockRevenue / totalRevenue) * 100}%`, background: "var(--brass)" }} />
        </div>
        <div className="num flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-text-mute">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink)]" /> {usd(subRevenue, { cents: true })} subscriptions
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--brass)]" /> {usd(unlockRevenue, { cents: true })} report unlocks
          </span>
        </div>
      </section>

      {/* Take rate */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Take rate</SectionLabel>
        <div className="num flex flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-5 text-sm">
          <div className="flex justify-between"><span className="text-text-mute">Gross</span><span>{usd(gross, { cents: true })}</span></div>
          <div className="flex justify-between"><span className="text-text-mute">Stoa fee (10%)</span><span className="text-text-mute">-{usd(fee, { cents: true })}</span></div>
          <div className="my-1 h-px bg-border" />
          <div className="flex justify-between font-semibold"><span>Your net</span><span>{usd(net, { cents: true })}</span></div>
        </div>
      </section>

      {/* Payout */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Payout</SectionLabel>
        <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <span className="num flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-btn)] bg-surface-2 text-sm font-medium">PP</span>
          <div className="flex-1">
            <p className="text-sm">PayPal</p>
            <p className="num mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--rust)]">Payouts on hold — connect PayPal</p>
          </div>
          <button type="button" className={buttonClass("secondary", "sm")} disabled>Connect PayPal</button>
        </div>
        <p className="t-meta">No payouts yet. Payout history will appear here once PayPal is connected.</p>
      </section>

      {/* Per-publication revenue (placeholder) */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Per-publication revenue</SectionLabel>
        <p className="t-meta">
          Per-publication revenue totals are not aggregated in the backend yet — coming with the earnings pipeline.
        </p>
      </section>

      {/* Credits spend */}
      <p className="num text-[11px] uppercase tracking-[0.14em] text-text-faint">
        AI credits are separate from earnings ·{" "}
        <Link href="/wallet" className="text-text underline">Manage in Wallet →</Link>
      </p>
    </div>
  );
}
