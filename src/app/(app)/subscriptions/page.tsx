import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { CreditCard } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { getSessionUserId } from "@/lib/db/auth";
import { listUserSubscriptions } from "@/lib/db/subscriptions";
import { usd } from "@/lib/format";
import { CancelSubscriptionButton } from "@/components/subscriptions/cancel-button";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const subs = await listUserSubscriptions(userId);
  const active = subs.filter(
    (s) => s.status === "active" && new Date(s.renews_at) > new Date(),
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
                  <Link
                    href={`/analyst/${s.analyst?.handle ?? ""}`}
                    className="font-medium hover:text-accent"
                  >
                    {s.analyst?.display_name ?? "Analyst"}
                  </Link>
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
    </div>
  );
}
