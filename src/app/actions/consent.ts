"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentLegalDocuments,
  getPendingConsentTypes,
  hasAgeAttestation,
  recordUserConsents,
  setAgeAttestation,
  setMarketingPreference,
} from "@/lib/db/legal";
import { SIGNUP_CONSENT_TYPES } from "@/lib/legal/constants";

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip");
}

export async function acceptConsents(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };

  // What is outstanding is decided here, not by the form. The form only renders
  // the legal checkbox when terms or privacy are pending, so demanding that tick
  // unconditionally locked out anyone who had already accepted them and only
  // owed an age attestation: they were told to agree to terms with no box on the
  // page to tick, and no way forward.
  const pending = await getPendingConsentTypes(user.id);
  const needsLegal = pending.length > 0;
  if (needsLegal && formData.get("legal_consent") !== "on") {
    return { error: "You must agree to the Terms of Service and Privacy Policy." };
  }

  const needsAge = !(await hasAgeAttestation(user.id));
  if (needsAge && formData.get("age_attestation") !== "on") {
    return { error: "You must confirm you are 18 years of age or older." };
  }
  if (needsAge) {
    await setAgeAttestation(user.id);
  }

  const ip = await clientIp();
  if (needsLegal) {
    const docs = await getCurrentLegalDocuments(SIGNUP_CONSENT_TYPES);
    await recordUserConsents(
      user.id,
      docs.map((d) => d.id),
      ip,
    );
  }

  if (formData.get("marketing_opt_in") === "on") {
    await setMarketingPreference(user.id, true, ip);
  }

  redirect("/home");
}

/** Record signup consents + age attestation after email registration. */
export async function recordSignupCompliance(
  userId: string,
  opts?: { marketingOptIn?: boolean },
): Promise<{ error?: string } | null> {
  const docs = await getCurrentLegalDocuments(SIGNUP_CONSENT_TYPES);
  const ip = await clientIp();
  await recordUserConsents(
    userId,
    docs.map((d) => d.id),
    ip,
  );
  await setAgeAttestation(userId);
  if (opts?.marketingOptIn) {
    await setMarketingPreference(userId, true, ip);
  }
  return null;
}

export async function getConsentRedirectPath(
  userId: string,
  known?: { ageAttested?: boolean },
): Promise<string | null> {
  const [pending, needsAge] = await Promise.all([
    getPendingConsentTypes(userId),
    known?.ageAttested === undefined
      ? hasAgeAttestation(userId).then((ok) => !ok)
      : Promise.resolve(!known.ageAttested),
  ]);
  if (pending.length > 0 || needsAge) return "/consent-required";
  return null;
}

/** Opt-in only. Leaving the box unchecked never turns marketing off. */
export async function recordMarketingOptInIfChecked(userId: string, formData: FormData): Promise<void> {
  if (formData.get("marketing_opt_in") !== "on") return;
  await setMarketingPreference(userId, true, await clientIp());
}
