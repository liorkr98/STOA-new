import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react/dist/ssr";
import { getSessionProfile } from "@/lib/db/auth";
import { getWallet, listTransactions } from "@/lib/db/wallet";
import { usd } from "@/lib/format";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { TopUpButton } from "@/components/wallet/top-up-button";
import type { TxnType } from "@/lib/types";

export const metadata: Metadata = { title: "Wallet" };

const txnLabel: Record<TxnType, string> = {
  deposit: "Top-up",
  report_unlock: "Report unlock",
  subscription: "Subscription",
  payout: "Earnings",
  refund: "Refund",
};

export default async function WalletPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const [wallet, txns] = await Promise.all([
    getWallet(profile.id),
    listTransactions(profile.id),
  ]);
  const isAnalyst = profile.role === "analyst" || profile.role === "admin";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="t-h1">Wallet</h1>
        <TopUpButton />
      </div>

      <div className="grid gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:grid-cols-2">
        <Stat label="Balance" value={usd(wallet?.balance ?? 0, { cents: true })} />
        {isAnalyst && (
          <Stat label="Lifetime earnings" value={usd(wallet?.earnings ?? 0, { cents: true })} />
        )}
      </div>

      <div>
        <h2 className="t-h3 mb-3">Activity</h2>
        {txns.length > 0 ? (
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            {txns.map((t) => {
              const credit = t.amount >= 0;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text-mute"
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
                  <span
                    className="num text-sm font-semibold"
                    style={{ color: credit ? "var(--up)" : "var(--text)" }}
                  >
                    {credit ? "+" : ""}
                    {usd(t.amount, { cents: true })}
                  </span>
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
