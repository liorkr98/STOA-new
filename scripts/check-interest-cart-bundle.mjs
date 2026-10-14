// After `next build`: the Interest Cart must not be in any page's eager code.
// Behind FEATURE_INTEREST_CART the cart's runtime, panel, controls and
// animals load only through dynamic import, after the server says yes. This
// walks every page's client reference manifest (its entry chunks and every
// client module it can render) and fails if one of them carries the cart.
// Stylesheets too: the cart's styles ship only with its own chunks.
// Delete at launch with the flag: the cart then belongs in the main bundle.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const NEXT = ".next";
const MARKERS = [
  ["the bull's artwork", "M 6.99 7.99 C 4.99 17.99"],
  ["the cart panel", "cart-scrim"],
  ["the cart's toast", "Added to your cart"],
  ["the cart's colours", "--cart-bull"],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : name.endsWith("_client-reference-manifest.js") ? [path] : [];
  });
}

const manifests = walk(join(NEXT, "server", "app"));
if (manifests.length === 0) {
  console.error("No client reference manifests under .next/server/app: run `next build` first.");
  process.exit(1);
}

const chunkText = new Map();
const read = (chunk) => {
  const file = join(NEXT, chunk.replace(/^\/?_next\//, ""));
  if (!chunkText.has(file)) {
    try {
      chunkText.set(file, readFileSync(file, "utf8"));
    } catch {
      chunkText.set(file, "");
    }
  }
  return chunkText.get(file);
};

const failures = [];
for (const path of manifests) {
  const source = readFileSync(path, "utf8");
  const json = JSON.parse(source.slice(source.indexOf("= {") + 2).replace(/;\s*$/, ""));
  const css = Object.values(json.entryCSSFiles ?? {})
    .flat()
    .map((f) => (typeof f === "string" ? f : f?.path))
    .filter(Boolean);
  const chunks = new Set([
    ...Object.values(json.entryJSFiles ?? {}).flat(),
    ...css,
    ...Object.values(json.clientModules ?? {}).flatMap((m) => m.chunks ?? []),
  ]);
  for (const chunk of chunks) {
    const text = read(chunk);
    for (const [what, marker] of MARKERS) {
      if (text.includes(marker)) failures.push(`${path.replace(/^.*server\/app/, "")}: ${chunk} carries ${what}`);
    }
  }
}

if (failures.length) {
  console.error(`The Interest Cart is in eager page code:\n${[...new Set(failures)].join("\n")}`);
  process.exit(1);
}
console.log(`Interest Cart bundle check: ${manifests.length} pages, ${chunkText.size} chunks, none carries the cart.`);
