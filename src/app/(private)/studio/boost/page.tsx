import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { getSessionProfile } from "@/lib/db/auth";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Boost" };

export default async function BoostPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-[var(--w-reading)]">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Boost</h1>
      <p className="t-body mt-2">Paid placement is not live yet.</p>
      <div className="mt-8">
        <EmptyState
          icon={<Megaphone size={32} />}
          title="Boost is not for sale yet"
          body="When it is, every promoted placement will be labelled Promoted. It will never change your Track Score or where your calls rank on merit."
        />
      </div>
    </div>
  );
}
