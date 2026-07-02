import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/db/auth";
import { PriceStep } from "@/components/onboarding/price-step";

export const metadata: Metadata = { title: "Set your pricing" };

export default async function AnalystPricePage() {
  const profile = (await getSessionProfile())!;
  return (
    <div>
      <div className="text-center">
        <h1 className="t-h1">Set your pricing</h1>
        <p className="t-body mt-2">You can change these later in Settings.</p>
      </div>
      <PriceStep subPrice={profile.sub_price} reportPrice={profile.report_price} />
    </div>
  );
}
