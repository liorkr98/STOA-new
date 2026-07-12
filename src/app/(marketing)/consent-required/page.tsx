import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConsentForm } from "@/components/legal/consent-form";
import { getPendingConsentTypes, hasAgeAttestation } from "@/lib/db/legal";

export const metadata: Metadata = { title: "Accept terms" };

export default async function ConsentRequiredPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const pendingTypes = await getPendingConsentTypes(user.id);
  const requireAge = !(await hasAgeAttestation(user.id));

  if (pendingTypes.length === 0 && !requireAge) {
    redirect("/home");
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-5 py-16">
      <ConsentForm pendingTypes={pendingTypes} requireAge={requireAge} />
    </div>
  );
}
