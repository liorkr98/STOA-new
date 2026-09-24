/**
 * Whether a published publication may be deleted outright, and why not.
 *
 * A publication that declares a stance is on the record: it can be archived,
 * never deleted, so a wrong view cannot be buried. While grading runs, a call
 * counts the same way (every call's direction is its publication's stance).
 * And a publication anyone has bought is never deleted, whatever its stance:
 * a reader losing what they paid for is worse than a creator unable to tidy
 * up. Drafts are not governed here; they were never published.
 *
 * The database enforces the same rule (migration 0066); this is what the
 * Studio uses to offer or withhold Delete, and the words it says when refusing.
 */
export function deleteBlocker(input: { hasStance: boolean; hasCall: boolean; sold: boolean }): string | null {
  if (input.sold) {
    return "Someone has bought this publication, so it can be archived but not deleted.";
  }
  if (input.hasStance || input.hasCall) {
    return "This publication declares a stance, so it can be archived but not deleted.";
  }
  return null;
}
