/**
 * The Stoa extension's id, pinned by the public key in its manifest
 * (extension/wxt.config.ts), so an unpacked copy has it on every machine.
 * The site sends the extension its session and reads its taps under this
 * id; a Chrome Web Store copy gets another id, added through
 * NEXT_PUBLIC_STOA_EXTENSION_IDS (comma-separated) without a code change.
 */
export const STOA_EXTENSION_ID = "aobmhpgimghcngjppdbcglejomfgioan";

export function extensionIds(): string[] {
  const extra = (process.env.NEXT_PUBLIC_STOA_EXTENSION_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-p]{32}$/.test(s));
  return [STOA_EXTENSION_ID, ...extra];
}
