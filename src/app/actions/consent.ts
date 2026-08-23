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

  if (formData.get("legal_consent") !== "on") {
    return { error: "You must agree to the Terms of Service and Privacy Policy." };
  }

  const needsAge = !(await hasAgeAttestation(user.id));
  if (needsAge && formData.get("age_attestation") !== "on") {
    return { error: "You must confirm you are 18 years of age or older." };
  }
  if (needsAge) {
    await setAgeAttestation(user.id);
  }

  const docs = await getCurrentLegalDocuments(SIGNUP_CONSENT_TYPES);
  const ip = await clientIp();
  await recordUserConsents(
    user.id,
    docs.map((d) => d.id),
    ip,
  );

  redirect("/home");
}

/** Record signup consents + age attestation after email registration. */
export async function recordSignupCompliance(userId: string): Promise<{ error?: string } | null> {
  const docs = await getCurrentLegalDocuments(SIGNUP_CONSENT_TYPES);
  const ip = await clientIp();
  await recordUserConsents(
    userId,
    docs.map((d) => d.id),
    ip,
  );
  await setAgeAttestation(userId);
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
