import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, Wallet as WalletIcon } from "@phosphor-icons/react/dist/ssr";
import { getSessionProfile } from "@/lib/db/auth";
import { getWallet, listTransactions } from "@/lib/db/wallet";
import { usd } from "@/lib/format";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { TopUpButton } from "@/components/wallet/top-up-button";
import { ConvertCreditsButton } from "@/components/wallet/convert-credits-button";
import type { TxnType } from "@/lib/types";

export const metadata: Metadata = { title: "Wallet" };

const txnLabel: Record<TxnType, string> = {
  deposit: "Top-up",
  report_unlock: "Report unlock",
  subscription: "Subscription",
  payout: "Earnings",
  refund: "Refund",
  ai_spend: "AI usage",
  conversion: "Credits purchase",
};

export default async function WalletPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const [wallet, txns] = await Promise.all([
    getWallet(profile.id),
    listTransactions(profile.id),
  ]);
  const isAnalyst = profile.role === "analyst" || profile.role === "admin";

  // The 90/10 split is shown wherever earnings appear, every time -- a
  // deliberate trust-building repetition, not just once at signup.
  const netEarnings = wallet?.earnings ?? 0;
  const grossEarnings = netEarnings / 0.9;
  const platformFee = grossEarnings - netEarnings;

  const revenueTxns = txns.filter((t) => t.amount > 0 && (t.type === "subscription" || t.type === "report_unlock"));
  const subRevenue = revenueTxns.filter((t) => t.type === "subscription").reduce((s, t) => s + t.amount, 0);
  const reportRevenue = revenueTxns.filter((t) => t.type === "report_unlock").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="t-h1">Wallet</h1>
        <TopUpButton />
      </div>

      <p
        className="rounded-[var(--radius-btn)] border border-border bg-surface-2 px-3 py-2 text-sm text-text-mute"
        role="status"
      >
        Balances are simulated until PayPal checkout is connected. Activity may show sandbox
        deposits.
      </p>

      <div className="grid gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Balance" value={usd(wallet?.balance ?? 0, { cents: true })} />
        <Stat label="AI credits" value={String(wallet?.ai_credits ?? 0)} />
        {isAnalyst && (
          <Stat label="Lifetime earnings" value={usd(netEarnings, { cents: true })} />
        )}
      </div>

      {isAnalyst && netEarnings > 0 && (
        <section className="ledger-card p-5">
          <p className="t-eyebrow mb-3">Earnings breakdown</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-mute">Gross</span>
              <span className="num">{usd(grossEarnings, { cents: true })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-mute">Platform fee (10%)</span>
              <span className="num text-text-mute">-{usd(platformFee, { cents: true })}</span>
            </div>
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between font-semibold">
              <span>Net</span>
              <span className="num">{usd(netEarnings, { cents: true })}</span>
            </div>
          </div>
          {revenueTxns.length > 0 && (
            <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-sm">
              <span className="text-text-mute">By source:</span>
              <span className="num">{usd(subRevenue, { cents: true })} subscriptions</span>
              <span className="num">{usd(reportRevenue, { cents: true })} report unlocks</span>
            </div>
          )}
        </section>
      )}

      {isAnalyst && (
        <section>
          <p className="t-eyebrow mb-3">Payout method</p>
          <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-card)] bg-surface-2 text-text-mute">
              <WalletIcon size={20} weight="bold" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">PayPal</p>
              <p className="t-meta">Not connected yet -- payouts are on hold until this is set up.</p>
            </div>
            <button type="button" className={buttonClass("secondary", "sm")} disabled>
              Connect PayPal
            </button>
          </div>
        </section>
      )}

      <ConvertCreditsButton balance={wallet?.balance ?? 0} />

      <div>
        <h2 className="t-h3 mb-3">Activity</h2>
        {txns.length > 0 ? (
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            {txns.map((t) => {
              const credit = t.amount >= 0;
              const isCreditsTxn = t.type === "ai_spend" || t.type === "conversion";
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-btn)] bg-surface-2 text-text-mute"
                    >
                      {credit ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                    </span>
                    <div className="leading-tight">
                      <div className="text-sm font-medium">{txnLabel[t.type]}</div>
                      <div className="t-meta">
                        {t.memo ? `${t.memo} · ` : ""}
                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  {isCreditsTxn && t.credits != null ? (
                    <span
                      className="num text-sm font-semibold"
                      style={{ color: t.credits >= 0 ? "var(--up)" : "var(--text)" }}
                    >
                      {t.credits >= 0 ? "+" : ""}
                      {t.credits} credits
                    </span>
                  ) : (
                    <span
                      className="num text-sm font-semibold"
                      style={{ color: credit ? "var(--up)" : "var(--text)" }}
                    >
                      {credit ? "+" : ""}
                      {usd(t.amount, { cents: true })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No activity yet" body="Your transactions will appear here." />
        )}
      </div>
    </div>
  );
}
