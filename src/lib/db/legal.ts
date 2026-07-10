import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const docs: LegalDocument[] = [];

  for (const docType of types) {
    const { data } = await supabase
      .from("legal_documents")
      .select("id, doc_type, version, content_url, effective_at")
      .eq("doc_type", docType)
      .order("effective_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) docs.push(data as LegalDocument);
  }

  return docs;
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
  const current = await getCurrentLegalDocuments(SIGNUP_CONSENT_TYPES);
  const accepted = await getUserConsentedDocumentIds(userId);
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
