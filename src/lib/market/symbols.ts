/**
 * Symbol normalization. One canonical form in, provider-specific forms out, so
 * a ticker typed once in a block works across every provider (see
 * docs/DATA_STACK.md section 5). Pure module -- safe to import anywhere.
 */

/**
 * Canonical form: uppercase, trimmed, whitespace stripped. Class shares keep a
 * dot separator canonically (BRK.B), which providers can translate as needed.
 */
export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Finnhub uses a dot for class shares (BRK.B) -- same as canonical. */
export function toFinnhub(symbol: string): string {
  return normalizeSymbol(symbol);
}

/** FMP uses a dash for class shares (BRK-B). */
export function toFmp(symbol: string): string {
  return normalizeSymbol(symbol).replace(/\./g, "-");
}

/** Basic shape guard so we don't send junk to a provider. */
export function isValidSymbol(raw: string): boolean {
  const s = normalizeSymbol(raw);
  return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(s);
}
