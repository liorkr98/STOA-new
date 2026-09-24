/**
 * Whether a published publication may be deleted outright, and why not.
 *
 * A publication that declares a stance is on the record: it can be archived,
 * never deleted, so a wrong view cannot be buried. (Before migration 0065 the
 * stance of a publication that carried a call is read from the archived call;
 * `publicationRow` bridges it.) And a publication anyone has bought is never deleted, whatever its stance:
 * a reader losing what they paid for is worse than a creator unable to tidy
 * up. Drafts are not governed here; they were never published.
 *
 * The database enforces the same rule (migration 0066); this is what the
 * Studio uses to offer or withhold Delete, and the words it says when refusing.
 */
export function deleteBlocker(input: { hasStance: boolean; sold: boolean }): string | null {
  if (input.sold) {
    return "Someone has bought this publication, so it can be archived but not deleted.";
  }
  if (input.hasStance) {
    return "This publication declares a stance, so it can be archived but not deleted.";
  }
  return null;
}
