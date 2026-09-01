import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { cachedPage } from "@/lib/cache/page";
import type { LegalDocType } from "@/lib/legal/constants";

export interface LegalDocument {
  id: string;
  doc_type: LegalDocType;
  version: string;
  content_url: string;
  effective_at: string;
}

export async function getCurrentLegalDocuments(
  types: LegalDocType[],
): Promise<LegalDocument[]> {
  const key = [...types].sort().join(",");
  return cachedPage(`legal-docs:${key}`, 300, async () => {
    const supabase = createPublicClient();
    const rows = await Promise.all(
      types.map(async (docType) => {
        const { data } = await supabase
          .from("legal_documents")
          .select("id, doc_type, version, content_url, effective_at")
          .eq("doc_type", docType)
          .order("effective_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as LegalDocument | null;
      }),
    );
    return rows.filter((row): row is LegalDocument => row != null);
  });
}

export async function getUserConsentedDocumentIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_consents")
    .select("legal_document_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.legal_document_id as string));
}

/** Document types the user has not accepted at the current published version. */
export async function getPendingConsentTypes(userId: string): Promise<LegalDocType[]> {
  const { SIGNUP_CONSENT_TYPES } = await import("@/lib/legal/constants");
  const [current, accepted] = await Promise.all([
    getCurrentLegalDocuments(SIGNUP_CONSENT_TYPES),
    getUserConsentedDocumentIds(userId),
  ]);
  return current
    .filter((doc) => !accepted.has(doc.id))
    .map((doc) => doc.doc_type);
}

export async function recordUserConsents(
  userId: string,
  documentIds: string[],
  ipAddress?: string | null,
): Promise<void> {
  if (documentIds.length === 0) return;
  const supabase = await createClient();
  const rows = documentIds.map((legal_document_id) => ({
    user_id: userId,
    legal_document_id,
    ip_address: ipAddress ?? null,
  }));
  const { error } = await supabase.from("user_consents").upsert(rows, {
    onConflict: "user_id,legal_document_id",
    ignoreDuplicates: false,
  });
  if (error) throw error;
}

export async function setAgeAttestation(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ age_attested_at: new Date().toISOString() })
    .eq("id", userId)
    .is("age_attested_at", null);
  if (error) throw error;
}

export async function hasAgeAttestation(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("age_attested_at")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.age_attested_at);
}

export async function getMarketingOptIn(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("marketing_opt_in")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.marketing_opt_in);
}

/** Persist marketing preference. Opt-in also records the marketing notice version. */
export async function setMarketingPreference(
  userId: string,
  optIn: boolean,
  ipAddress?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      marketing_opt_in: optIn,
      marketing_opt_in_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
  if (!optIn) return;
  const docs = await getCurrentLegalDocuments(["marketing"]);
  await recordUserConsents(
    userId,
    docs.map((d) => d.id),
    ipAddress,
  );
}

/**
 * Record the consents a user gave on the signup form.
 *
 * Runs with the admin client on purpose. When email confirmation is on, signUp
 * returns a user but no session, so the RLS policies on `user_consents` and
 * `profiles` (which key off auth.uid()) have nobody to match and the write is
 * impossible from the request's own client. The attestation happened at signup
 * and has to be stored with that moment's timestamp and IP, so it cannot simply
 * be deferred to the first sign-in, where the ticks no longer exist.
 *
 * The user id comes straight from the signUp response, never from user input.
 */
export async function recordSignupConsentsAsAdmin(
  userId: string,
  input: { marketingOptIn: boolean; ipAddress?: string | null },
): Promise<void> {
  const { SIGNUP_CONSENT_TYPES } = await import("@/lib/legal/constants");
  const admin = createAdminClient();
  const ip = input.ipAddress ?? null;

  const docs = await getCurrentLegalDocuments(SIGNUP_CONSENT_TYPES);
  if (docs.length > 0) {
    const { error } = await admin.from("user_consents").upsert(
      docs.map((d) => ({ user_id: userId, legal_document_id: d.id, ip_address: ip })),
      { onConflict: "user_id,legal_document_id", ignoreDuplicates: false },
    );
    if (error) throw error;
  }

  const { error: ageError } = await admin
    .from("profiles")
    .update({ age_attested_at: new Date().toISOString() })
    .eq("id", userId)
    .is("age_attested_at", null);
  if (ageError) throw ageError;

  if (!input.marketingOptIn) return;

  const { error: mktError } = await admin
    .from("profiles")
    .update({ marketing_opt_in: true, marketing_opt_in_at: new Date().toISOString() })
    .eq("id", userId);
  if (mktError) throw mktError;

  const marketingDocs = await getCurrentLegalDocuments(["marketing"]);
  if (marketingDocs.length === 0) return;
  const { error: mktConsentError } = await admin.from("user_consents").upsert(
    marketingDocs.map((d) => ({ user_id: userId, legal_document_id: d.id, ip_address: ip })),
    { onConflict: "user_id,legal_document_id", ignoreDuplicates: false },
  );
  if (mktConsentError) throw mktConsentError;
}
