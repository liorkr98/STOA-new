import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import { getWallet, listTransactions } from "@/lib/db/wallet";
import { usd } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { TopUpButton } from "@/components/wallet/top-up-button";
import { ConvertCreditsButton } from "@/components/wallet/convert-credits-button";
import type { TxnType } from "@/lib/types";

export const metadata: Metadata = { title: "Wallet" };

const txnLabel: Record<TxnType, string> = {
  deposit: "Top-up",
  report_unlock: "Report unlock",
  subscription: "Subscription",
  payout: "Payout",
  refund: "Refund",
  ai_spend: "AI usage",
  conversion: "Credits purchase",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="num border-b border-[var(--ink)] pb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">
      {children}
    </div>
  );
}

export default async function WalletPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const [wallet, txns] = await Promise.all([
    getWallet(profile.id),
    listTransactions(profile.id),
  ]);

  const balance = wallet?.balance ?? 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Wallet</h1>
          <p className="t-body mt-2">Credits and spending.</p>
        </div>
        <TopUpButton />
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-3.5">
        <div className="rounded-[var(--radius-card)] bg-surface-2 px-5 py-4">
          <div className="num text-[10.5px] uppercase tracking-[0.18em] text-text-mute">Balance</div>
          <div className="mt-2.5 text-[28px] font-semibold tracking-tight">{usd(balance, { cents: true })}</div>
        </div>
        <div className="rounded-[var(--radius-card)] bg-surface-2 px-5 py-4">
          <div className="num text-[10.5px] uppercase tracking-[0.18em] text-text-mute">AI credits</div>
          <div className="mt-2.5 text-[28px] font-semibold tracking-tight">{wallet?.ai_credits ?? 0}</div>
        </div>
      </div>

      {/* Buy AI credits (packages + note live in ConvertCreditsButton) */}
      <ConvertCreditsButton balance={balance} />

      {/* Payment method */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Payment method</SectionLabel>
        <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <span className="num flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-btn)] bg-surface-2 text-sm font-medium">
            PP
          </span>
          <div className="flex-1">
            <p className="text-sm">PayPal</p>
            <p className="num mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--rust)]">Not connected</p>
          </div>
          <button type="button" className={buttonClass("secondary", "sm")} disabled>
            Connect
          </button>
        </div>
      </section>

      {/* Activity */}
      <section className="flex flex-col gap-1">
        <SectionLabel>Activity</SectionLabel>
        {txns.length === 0 ? (
          <p className="t-meta mt-3">No activity yet.</p>
        ) : (
          <>
            <div className="num hidden grid-cols-[120px_1fr_110px] gap-5 border-b border-border py-3 text-[9.5px] uppercase tracking-[0.16em] text-text-faint md:grid">
              <div>Date</div>
              <div>Description</div>
              <div className="text-right">Amount</div>
            </div>
            {txns.map((t) => {
              const credit = t.amount >= 0;
              const isCreditsTxn = t.type === "ai_spend" || t.type === "conversion";
              return (
                <div
                  key={t.id}
                  className="num flex items-center justify-between gap-5 border-b border-border py-3 text-[12.5px] md:grid md:grid-cols-[120px_1fr_110px]"
                >
                  <div className="hidden text-text-mute md:block">
                    {format(new Date(t.created_at), "MMM d, yyyy").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="font-sans text-[14px]">{txnLabel[t.type]}</span>
                    {t.memo && <span className="ml-2 text-text-faint">{t.memo}</span>}
                    <span className="ml-2 text-text-faint md:hidden">
                      {format(new Date(t.created_at), "MMM d").toUpperCase()}
                    </span>
                  </div>
                  <div
                    className="shrink-0 text-right font-semibold"
                    style={{ color: credit ? "var(--up)" : "var(--down)" }}
                  >
                    {isCreditsTxn && t.credits != null
                      ? `${t.credits >= 0 ? "+" : ""}${t.credits} cr`
                      : `${credit ? "+" : ""}${usd(t.amount, { cents: true })}`}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>
    </div>
  );
}
