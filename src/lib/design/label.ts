/**
 * Sentence case for a label that arrives in capitals ("THESIS", "VIDEO · BRIEF",
 * "SUBSCRIBERS"). Labels are never shown in capitals under Direction B. Only
 * for words that are not tickers: a ticker keeps its capitals.
 */
export function labelCase(label: string): string {
  return label.replace(/\b([A-Z])([A-Z]+)\b/g, (_, first: string, rest: string) => first + rest.toLowerCase());
}
