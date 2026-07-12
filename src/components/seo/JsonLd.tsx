/**
 * Renders a Schema.org object as a JSON-LD <script> tag. Server Component --
 * pure serialization, no client JS.
 *
 * Safety: JSON.stringify does not escape "</script>", so a string field
 * containing that sequence (an analyst's report title, a claim quote) could
 * close the script tag early and inject markup into the page. Escaping "<" to
 * its JSON-safe unicode escape neutralizes that without altering the value
 * once parsed back out as JSON. The U+2028/U+2029 line/paragraph separators
 * are escaped too: valid inside a JSON string but capable of breaking some
 * script-body parsers, so treat them the same way.
 */
function safeJsonLd(data: object): string {
  const LT = String.fromCharCode(0x3c);
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(data)
    .split(LT)
    .join("\\u003c")
    .split(LS)
    .join("\\u2028")
    .split(PS)
    .join("\\u2029");
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Content is escaped in safeJsonLd above, not raw HTML.
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
