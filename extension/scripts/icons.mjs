/**
 * Draws the extension's icons from Stoa's mark: the ink colonnade on paper,
 * the proportions of the site's own app icon (src/lib/pwa/icon-response.tsx).
 * Run: node scripts/icons.mjs (uses sharp from the app's node_modules).
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("../../node_modules/sharp");

function colonnade(x, y, size) {
  const inner = size;
  const bw = Math.max(2, Math.round(inner * 0.14));
  const gap = Math.max(1, Math.round(inner * 0.14));
  const total = bw * 3 + gap * 2;
  const x0 = x + Math.round((inner - total) / 2);
  const rx = Math.max(1, Math.round(bw * 0.35));
  return [[0.72, 0.45], [1, 1], [0.58, 0.45]]
    .map(([h, o], i) => {
      const hh = Math.round(inner * h);
      return `<rect x="${x0 + i * (bw + gap)}" y="${y + inner - hh}" width="${bw}" height="${hh}" rx="${rx}" fill="#101418" fill-opacity="${o}"/>`;
    })
    .join("");
}

/** A paper tile with the mark, inset like the site's maskable icon. */
function tile(size, canvas = size) {
  const off = (canvas - size) / 2;
  const pad = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}"><rect x="${off}" y="${off}" width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#FAFAFA" stroke="#E6E8EB" stroke-width="${size >= 48 ? 1 : 0}"/>${colonnade(off + pad, off + pad, size - pad * 2)}</svg>`;
}

const out = [];
for (const s of [16, 32, 48, 128]) out.push(sharp(Buffer.from(tile(s))).png().toFile(`public/icon/${s}.png`));
// The store's listing icon: 128 x 128 with the art at 96 x 96 and a clear margin.
out.push(sharp(Buffer.from(tile(96, 128))).png().toFile("store-assets/icon-128.png"));
// The store's small promo tile, 440 x 280.
const promo = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280"><rect width="440" height="280" fill="#FAFAFA"/>${colonnade(48, 92, 96)}<text x="176" y="134" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#101418">Stoa</text><text x="176" y="170" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#101418">Interest Cart</text><text x="176" y="204" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="#5B6470">The stocks in the video you watch.</text></svg>`;
out.push(sharp(Buffer.from(promo)).png().toFile("store-assets/promo-440x280.png"));
await Promise.all(out);
console.log("icons written");
