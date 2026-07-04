"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RocketLaunch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { purchaseBoost } from "@/app/actions/boost";
import { BOOST_PACKAGES } from "@/lib/profile/boost-packages";
import type { ProfileBoost } from "@/lib/db/boosts";
import type { Report } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";

export function BoostPanel({
  walletBalance,
  activeBoosts,
  reports,
}: {
  walletBalance: number;
  activeBoosts: ProfileBoost[];
  reports: Report[];
}) {
  const router = useRouter();
  const [packageId, setPackageId] = useState(BOOST_PACKAGES[0].id);
  const [reportId, setReportId] = useState(reports[0]?.id ?? "");
  const [pending, start] = useTransition();

  const pkg = BOOST_PACKAGES.find((p) => p.id === packageId)!;
  const needsReport = pkg.target_type === "report";

  function buy() {
    start(async () => {
      const res = await purchaseBoost({
        package_id: packageId,
        report_id: needsReport ? reportId : undefined,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not purchase boost");
        return;
      }
      toast.success("Boost activated — your placement is live in Discover");
      router.refresh();
    });
  }

  return (
    <div className="surface flex flex-col gap-5 p-6">
      <div>
        <h2 className="t-h3">Boost visibility</h2>
        <p className="t-meta mt-1">
          Promote your profile in Researchers + sidebar, or a report in Trending. Labeled
          &quot;Promoted&quot; for transparency.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {BOOST_PACKAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPackageId(p.id)}
            className={cn(
              "rounded-[var(--radius-card)] border p-4 text-left transition-colors",
              packageId === p.id ? "border-accent bg-accent-weak/30" : "border-border hover:border-border-strong",
            )}
          >
            <p className="font-medium">{p.label}</p>
            <p className="t-meta mt-1 text-[12px]">{p.description}</p>
            <p className="num mt-2 text-lg font-semibold">${p.price}</p>
          </button>
        ))}
      </div>

      {needsReport && (
        <label className="text-sm">
          Report to promote
          <select
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm"
          >
            {reports.length === 0 ? (
              <option value="">Publish a report first</option>
            ) : (
              reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))
            )}
          </select>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={pending || (needsReport && !reportId) || walletBalance < pkg.price}
          onClick={buy}
        >
          <RocketLaunch size={16} />
          {pending ? "Processing..." : `Boost for $${pkg.price}`}
        </Button>
        <span className="t-meta text-[11px]">Wallet balance: ${walletBalance.toFixed(2)}</span>
      </div>

      {activeBoosts.length > 0 && (
        <div>
          <p className="text-sm font-medium">Active boosts</p>
          <ul className="mt-2 flex flex-col gap-2">
            {activeBoosts.map((b) => (
              <li
                key={b.id}
                className="rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm"
              >
                {b.target_type === "profile" ? "Profile" : "Report"} · {b.placement} · ends{" "}
                {new Date(b.ends_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
