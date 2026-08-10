import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { CreditCard, Wallet as WalletIcon } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { getSessionUserId } from "@/lib/db/auth";
import { listUserSubscriptions } from "@/lib/db/subscriptions";
import { listTransactions } from "@/lib/db/wallet";
import { usd } from "@/lib/format";
import { CancelSubscriptionButton } from "@/components/subscriptions/cancel-button";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const [subs, txns] = await Promise.all([
    listUserSubscriptions(userId),
    listTransactions(userId),
  ]);
  const active = subs.filter(
    (s) => s.status === "active" && new Date(s.renews_at) > new Date(),
  );
  const purchases = txns.filter(
    (t) => t.type === "report_unlock" || t.type === "subscription",
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="t-h1">Subscriptions</h1>
        <p className="t-body mt-1">Analysts you support. Access stays active until the period ends.</p>
      </div>

      {active.length > 0 ? (
        <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {active.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0"
            >
              <div className="flex items-center gap-3">
                {s.analyst && (
                  <Avatar src={s.analyst.avatar_url} name={s.analyst.display_name} size="md" />
                )}
                <div>
                  {s.analyst?.handle ? (
                    <Link
                      href={`/analyst/${s.analyst.handle}`}
                      className="font-medium hover:text-accent"
                    >
                      {s.analyst.display_name}
                    </Link>
                  ) : (
                    <span className="font-medium">{s.analyst?.display_name ?? "Analyst"}</span>
                  )}
                  <p className="t-meta">
                    {usd(s.price)}/mo · access until {format(new Date(s.renews_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <CancelSubscriptionButton analystId={s.analyst_id} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<CreditCard size={32} />}
          title="No active subscriptions"
          body="Subscribe to an analyst to unlock subscriber-only research."
          action={
            <Link href="/discover?tab=researchers" className={buttonClass("primary", "md")}>
              Browse analysts
            </Link>
          }
        />
      )}

      <section>
        <h2 className="t-h3 mb-3">Payment method</h2>
        <div className="ledger-card flex items-center gap-4 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tag)] bg-surface-2 text-text-mute">
            <WalletIcon size={20} weight="bold" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">PayPal</p>
            <p className="t-meta">Not connected yet</p>
          </div>
          <button type="button" className={buttonClass("secondary", "sm")} disabled>
            Connect PayPal
          </button>
        </div>
      </section>

      <section>
        <h2 className="t-h3 mb-3">Purchase history</h2>
        {purchases.length > 0 ? (
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            {purchases.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {t.type === "subscription" ? "Subscription payment" : "Report unlock"}
                  </p>
                  <p className="t-meta">{format(new Date(t.created_at), "MMM d, yyyy")}</p>
                </div>
                <span className="num text-sm font-semibold">{usd(Math.abs(t.amount), { cents: true })}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-meta">No purchases yet.</p>
        )}
      </section>
    </div>
  );
}
