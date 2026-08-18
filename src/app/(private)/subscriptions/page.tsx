import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getSessionUserId } from "@/lib/db/auth";
import { listUserSubscriptions } from "@/lib/db/subscriptions";
import { listUnlockedReports } from "@/lib/db/library";
import { usd } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { CancelSubscriptionButton } from "@/components/subscriptions/cancel-button";

export const metadata: Metadata = { title: "Subscriptions" };

function initialsOf(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="num border-b border-[var(--ink)] pb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">
      {children}
    </div>
  );
}

export default async function SubscriptionsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const [subs, unlocked] = await Promise.all([
    listUserSubscriptions(userId),
    listUnlockedReports(userId),
  ]);

  const now = new Date();
  const active = subs.filter((s) => new Date(s.renews_at) > now);
  const totalSpend = unlocked.reduce((sum, u) => sum + (u.price ?? 0), 0);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="t-body mt-2">Analysts you support.</p>
      </div>

      {/* Active */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Active · {active.length}</SectionLabel>
        {active.length === 0 ? (
          <EmptyState
            title="No active subscriptions"
            body="Subscribe to an analyst to unlock subscriber-only research."
            action={
              <Link href="/discover" className={buttonClass("primary", "md")}>
                Browse analysts
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((s) => {
              const cancelling = s.status === "cancelled";
              const name = s.analyst?.display_name ?? "Analyst";
              return (
                <div
                  key={s.id}
                  className={`flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 ${cancelling ? "opacity-70" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--ink)] font-display text-sm text-[var(--paper)]">
                      {initialsOf(name)}
                    </span>
                    <span className="flex-1 font-display text-lg font-semibold tracking-tight">{name}</span>
                  </div>
                  <div className="mt-4 text-[15px]">Monthly subscription</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold tracking-tight">{usd(s.price)}</span>
                    <span className="num text-[11px] text-text-mute">/mo</span>
                  </div>
                  <div
                    className={`num mt-3.5 text-[10px] uppercase tracking-[0.14em] ${cancelling ? "text-text-faint" : "text-text-mute"}`}
                  >
                    {cancelling
                      ? `CANCELS ${format(new Date(s.renews_at), "MMM d, yyyy")} · ACCESS UNTIL THEN`
                      : `RENEWS ${format(new Date(s.renews_at), "MMM d, yyyy")}`}
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    {s.analyst?.handle && (
                      <Link
                        href={`/analyst/${s.analyst.handle}`}
                        className="text-sm underline decoration-border-strong underline-offset-4 hover:decoration-[var(--ink)]"
                      >
                        Manage
                      </Link>
                    )}
                    {!cancelling && <CancelSubscriptionButton analystId={s.analyst_id} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Payment method */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Payment method</SectionLabel>
        <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <span className="num flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-btn)] bg-surface-2 text-sm font-medium">
            PP
          </span>
          <div className="flex-1">
            <p className="text-sm">PayPal</p>
            <p className="num mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--rust)]">
              Not connected — renewals will fail
            </p>
          </div>
          <button type="button" className={buttonClass("secondary", "sm")} disabled>
            Connect
          </button>
        </div>
      </section>

      {/* Purchase history */}
      <section className="flex flex-col gap-1">
        <SectionLabel>Purchase history · report unlocks</SectionLabel>
        {unlocked.length === 0 ? (
          <p className="t-meta mt-3">No report unlocks yet.</p>
        ) : (
          <>
            <div className="num hidden grid-cols-[110px_1fr_200px_90px] gap-5 border-b border-border py-3 text-[10px] uppercase tracking-[0.16em] text-text-faint md:grid">
              <div>Date</div>
              <div>Report</div>
              <div>Analyst</div>
              <div className="text-right">Price</div>
            </div>
            {unlocked.map((u) => (
              <div
                key={u.report.id}
                className="num flex flex-col gap-1 border-b border-border py-3 text-[12.5px] md:grid md:grid-cols-[110px_1fr_200px_90px] md:items-center md:gap-5"
              >
                <div className="text-text-mute">
                  {u.unlockedAt ? format(new Date(u.unlockedAt), "MMM d, yyyy").toUpperCase() : "—"}
                </div>
                <div className="font-sans text-[14.5px]">{u.report.title ?? "Untitled"}</div>
                <div className="text-text-mute">{u.report.author?.display_name ?? "—"}</div>
                <div className="md:text-right">{u.price != null ? usd(u.price) : "—"}</div>
              </div>
            ))}
            <div className="num grid grid-cols-[1fr_90px] gap-5 py-4 text-[12.5px] md:grid-cols-[110px_1fr_200px_90px]">
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-faint md:col-start-2">
                Total spend · unlocks
              </div>
              <div className="text-right font-medium">{usd(totalSpend)}</div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
