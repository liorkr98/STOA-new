import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/db/auth";
import { becomeAnalyst, ensureProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Start publishing" };

const inputClass =
  "h-11 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 text-sm focus-ring";

export default async function BecomeAnalystPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role === "analyst" || profile.role === "admin") redirect("/studio/compose");

  await ensureProfile();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="t-h1">Start publishing</h1>
      <p className="t-body mt-2">
        One quick step to open the compose editor. Publish research, calls, and posts — Stoa takes
        10% of what you earn.
      </p>

      <form action={becomeAnalyst} className="mt-8 flex flex-col gap-5">
        <Button type="submit" size="lg">
          Open compose editor
        </Button>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <p className="text-sm font-medium">Optional — set your pricing now</p>
          <p className="t-meta mt-1">You can change these later in Settings.</p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="headline" className="text-sm font-medium">
                Headline
              </label>
              <input
                id="headline"
                name="headline"
                className={inputClass}
                placeholder="What you cover and how you think"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="sub_price" className="text-sm font-medium">
                  Monthly subscription (USD)
                </label>
                <input id="sub_price" name="sub_price" type="number" min={0} max={200} className={inputClass} placeholder="19" />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="report_price" className="text-sm font-medium">
                  Default report price (USD)
                </label>
                <input id="report_price" name="report_price" type="number" min={0} max={50} className={inputClass} placeholder="7" />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
