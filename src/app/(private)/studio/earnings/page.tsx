import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote } from "lucide-react";
import { getSessionProfile } from "@/lib/db/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-[var(--w-reading)]">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Earnings</h1>
      <p className="t-body mt-2">Payouts are not live yet.</p>
      <div className="mt-8">
        <EmptyState
          icon={<Banknote size={32} />}
          title="PayPal payouts are still being wired"
          body="When they are live, this page will show gross, the 10% platform fee, and your net. Until then, Track record is the record of your work."
          action={
            <Link href="/studio/track-record" className={buttonClass("secondary", "md")}>
              Open Track record
            </Link>
          }
        />
      </div>
    </div>
  );
}
