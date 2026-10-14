/**
 * The colour law, enforced. Run with `npm run test:contrast`; CI runs it.
 *
 * 1. Measures every text-on-surface and fill-with-its-ink pair in both
 *    themes, straight from globals.css, and fails under WCAG AA (4.5:1).
 * 2. Scans the source for the combinations the tokens exist to prevent:
 *    white words on a coloured fill, the bright fill tones used as words,
 *    uppercase or letterspaced labels, mono off a ticker, retired tokens.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const css = readFileSync("src/app/globals.css", "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {\n`);
  assert.ok(start >= 0, `no ${selector} block in globals.css`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) out[m[1]] = m[2].trim();
  return out;
}

const light = block(":root");
const dark = { ...light, ...block(".dark") };

function resolve(theme: Record<string, string>, name: string, depth = 0): string {
  const raw = theme[name];
  assert.ok(raw, `token ${name} is not defined`);
  const ref = raw.match(/^var\((--[\w-]+)\)$/);
  if (ref) {
    assert.ok(depth < 8, `token ${name} loops`);
    return resolve(theme, ref[1], depth + 1);
  }
  assert.match(raw, /^#[0-9a-f]{6}$/i, `token ${name} must resolve to a 6-digit hex, got ${raw}`);
  return raw.toLowerCase();
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const SURFACES = ["--paper", "--surface", "--surface-2"];
const WORDS = [
  "--text",
  "--text-mute",
  "--coral-text",
  "--gain-text",
  "--loss-text",
  "--up",
  "--down",
  "--error",
  "--ok",
  "--pending",
  "--mark-edited",
];
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const FILLS: [fill: string, ink: string][] = [
  ["--coral", "--on-coral"],
  ["--gain", "--on-gain"],
  ["--loss", "--on-loss"],
  ["--accent", "--accent-ink"],
];

for (const [themeName, theme] of [["light", light], ["dark", dark]] as const) {
  test(`${themeName}: every coloured or grey word clears 4.5:1 on every surface`, () => {
    for (const word of WORDS) {
      for (const surface of SURFACES) {
        const r = ratio(resolve(theme, word), resolve(theme, surface));
        assert.ok(r >= 4.5, `${word} on ${surface} is ${r.toFixed(2)}:1`);
      }
    }
  });

  test(`${themeName}: every fill carries an ink that clears 4.5:1`, () => {
    for (const [fill, ink] of FILLS) {
      const r = ratio(resolve(theme, fill), resolve(theme, ink));
      assert.ok(r >= 4.5, `${ink} on ${fill} is ${r.toFixed(2)}:1`);
    }
  });

  test(`${themeName}: error words read on their own box`, () => {
    const r = ratio(resolve(theme, "--error"), resolve(theme, "--error-soft"));
    assert.ok(r >= 4.5, `--error on --error-soft is ${r.toFixed(2)}:1`);
  });

  test(`${themeName}: the error red stays clear of the price red`, () => {
    // The red exception for errors is only safe while it cannot pass for a
    // price move: keep it at least 15 degrees of hue away from loss.
    const a = hue(resolve(theme, "--error"));
    const b = hue(resolve(theme, "--loss-text"));
    const gap = Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    assert.ok(gap >= 15, `--error and --loss-text are only ${gap.toFixed(1)} degrees apart`);
  });

  test(`${themeName}: decorative faint text still clears 3:1`, () => {
    const r = ratio(resolve(theme, "--text-faint"), resolve(theme, "--paper"));
    assert.ok(r >= 3, `--text-faint on --paper is ${r.toFixed(2)}:1`);
  });
}

test("light: the bright fills really do fail as words, so they must stay fills", () => {
  // If this ever passes 4.5 the split is unnecessary; if it fails the rule
  // below is what keeps coral words legible.
  assert.ok(ratio(resolve(light, "--coral"), resolve(light, "--surface")) < 4.5);
});

const source = execSync("git ls-files 'src/*.tsx' 'src/*.ts' 'src/*.css'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter((f) => !f.endsWith("contrast.test.ts"))
  .map((file) => ({ file, text: readFileSync(file, "utf8") }));

function offenders(pattern: RegExp, allow: (file: string) => boolean = () => false) {
  const hits: string[] = [];
  for (const { file, text } of source) {
    if (allow(file)) continue;
    text.split("\n").forEach((line, i) => {
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
      if (pattern.test(line)) hits.push(`${file}:${i + 1}  ${line.trim().slice(0, 120)}`);
    });
  }
  return hits;
}

test("no white or paper words on a coloured fill", () => {
  const hits = offenders(
    /\bbg-(coral|gain|loss)\b[^"'`]*\btext-(white|paper|\[var\(--(paper|accent-ink)\)\])|\btext-(white|paper|\[var\(--(paper|accent-ink)\)\])[^"'`]*\bbg-(coral|gain|loss)\b/,
  );
  assert.deepEqual(hits, [], `white text on coral/gain/loss:\n${hits.join("\n")}`);
});

test("the bright fill tones are never used for words", () => {
  const hits = offenders(
    /text-\[var\(--(coral|gain|loss)\)\]|(?<![-\w])color:\s*["']?var\(--(coral|gain|loss)\)/,
  );
  assert.deepEqual(hits, [], `use --coral-text / --gain-text / --loss-text for words:\n${hits.join("\n")}`);
});

test("no uppercase or letterspaced labels", () => {
  const hits = offenders(
    /(?<![\w-])uppercase(?![\w-])|text-transform:\s*uppercase|tracking-(wide|wider|widest|\[0?\.\d+em\])|letter-spacing:\s*0?\.\d+em/,
    (f) => f.startsWith("src/app/api/og/"),
  );
  assert.deepEqual(hits, [], `uppercase / letterspaced labels:\n${hits.join("\n")}`);
});

test("mono only on tickers", () => {
  const hits = offenders(/\bfont-mono\b|var\(--font-mono\)/, (f) =>
    ["src/components/ui/chip.tsx", "src/app/globals.css", CART_CSS_FILE].includes(f),
  );
  assert.deepEqual(hits, [], `font-mono outside the ticker chip:\n${hits.join("\n")}`);
  const cssMono = (css + "\n" + cartCss)
    .split(/\n(?=[^\s].*\{)/)
    .filter((rule) => /font-family:\s*var\(--font-mono\)/.test(rule))
    .map((rule) => rule.split("{")[0].trim());
  assert.deepEqual(
    cssMono.filter((sel) => !/ticker/.test(sel)),
    [],
    "stylesheet rules using mono must be ticker rules",
  );
});

test("the faint grey is decoration, never a text colour", () => {
  const hits = offenders(/(?<![\w-])(?:[a-z]+:)*text-text-faint\b|(?<![-\w])color:\s*["']?var\(--text-faint\)/);
  assert.deepEqual(hits, [], `faint text fails 4.5:1; use text-text-mute:\n${hits.join("\n")}`);
});

test("the reading size is only for the report body and the Compose editor", () => {
  // Both render through .stoa-prose in globals.css; nothing else may use it.
  const hits = offenders(/\btext-reading\b|--type-reading/, (f) => f === "src/app/globals.css");
  assert.deepEqual(hits, [], `reading size outside .stoa-prose:\n${hits.join("\n")}`);
});

test("retired tokens stay retired", () => {
  const hits = offenders(
    /var\(--(brass|verdigris|rust|plum|r-btn|r-card|r-tag|radius-btn|radius-card|radius-tag|font-fraunces|font-plex-[\w-]+)\)/,
  );
  assert.deepEqual(hits, [], `retired tokens:\n${hits.join("\n")}`);
});

/* ---------------------------------------------- the Interest Cart animals --- */

const ANIMALS_FILE = "src/components/interest-cart/animals.tsx";
// The cart's own stylesheet, loaded only with the cart (FEATURE_INTEREST_CART).
const CART_CSS_FILE = "src/components/interest-cart/interest-cart.css";
const cartCss = readFileSync(CART_CSS_FILE, "utf8");
const animalsSource = readFileSync(ANIMALS_FILE, "utf8");
const constBody = animalsSource.slice(animalsSource.indexOf("CART_ANIMAL_COLOURS = {"), animalsSource.indexOf("} as const;"));
const declared = (key: string) => {
  const m = constBody.match(new RegExp(`${key}: \\{ light: "(#[0-9a-f]{6})", dark: "(#[0-9a-f]{6})" \\}`, "i"));
  assert.ok(m, `CART_ANIMAL_COLOURS.${key} must give a light and a dark value`);
  return { light: m[1].toLowerCase(), dark: m[2].toLowerCase() };
};
const bullBody = declared("bull");
const bearBody = declared("bear");
const fixedParts = [...constBody.matchAll(/(?:bullMuzzle|bearMuzzle|bearFeatures): "(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase());
const animalColours = [bullBody.light, bullBody.dark, bearBody.light, bearBody.dark, ...fixedParts];

function cartToken(selector: string, name: string): string {
  const re = new RegExp(`(^|\\n)${selector.replace(/\./g, "\\.")} \\{[^}]*?${name}:\\s*(#[0-9a-f]{6});`, "i");
  const m = cartCss.match(re);
  assert.ok(m, `${name} is not set in ${selector}`);
  return m[2].toLowerCase();
}

test("the Interest Cart animals are the recorded exception, colour for colour", () => {
  const law = readFileSync("docs/DESIGN_LANGUAGE.md", "utf8");
  const start = law.indexOf("**The Interest Cart animals");
  assert.ok(start >= 0, "DESIGN_LANGUAGE.md must record the Interest Cart animals exception");
  const section = law.slice(start, law.indexOf("**THE ERROR EXCEPTION", start));
  const rows = Object.fromEntries(
    [...section.matchAll(/^\s*\| ([A-Za-z ]+) \| `(#[0-9A-Fa-f]{6})` \| `(#[0-9A-Fa-f]{6})` \|/gm)].map((m) => [
      m[1].trim(),
      [m[2].toLowerCase(), m[3].toLowerCase()],
    ]),
  );
  assert.deepEqual(rows["Bull body"], [bullBody.light, bullBody.dark], "bull body: doc and animals.tsx disagree");
  assert.deepEqual(rows["Bear body"], [bearBody.light, bearBody.dark], "bear body: doc and animals.tsx disagree");
  assert.equal(fixedParts.length, 3, "the muzzles and the bear's features are fixed in both themes");
  for (const part of ["Bull muzzle", "Bear muzzle", "Bear eyes and nose"]) {
    assert.ok(rows[part] && rows[part][0] === rows[part][1] && fixedParts.includes(rows[part][0]), `${part} disagrees`);
  }
  const drawn = new Set([...animalsSource.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase()));
  assert.deepEqual([...drawn].sort(), [...fixedParts].sort(), "animals.tsx draws a fixed colour it does not declare");
});

test("the body colours switch by theme, and the paper stance card keeps the light pair", () => {
  assert.equal(cartToken(":root", "--cart-bull"), bullBody.light);
  assert.equal(cartToken(":root", "--cart-bear"), bearBody.light);
  assert.equal(cartToken(".dark", "--cart-bull"), bullBody.dark);
  assert.equal(cartToken(".dark", "--cart-bear"), bearBody.dark);
  assert.equal(cartToken(".dark .keep-paper", "--cart-bull"), bullBody.light);
  assert.equal(cartToken(".dark .keep-paper", "--cart-bear"), bearBody.light);
});

test("the animal colours appear nowhere but the animals file and their two tokens", () => {
  const pattern = new RegExp(animalColours.join("|"), "i");
  // The cart's stylesheet holds only --cart-bull / --cart-bear (checked above). The one
  // other file is the analyst's own diagram themes (a third-party "neon"
  // palette that happens to contain #ff6b6b): diagram ink chosen by the
  // author, not Stoa chrome, so it is not a second drawing of the bear.
  const hits = offenders(pattern, (f) => f === ANIMALS_FILE || f === "src/lib/diagram/colors.ts").filter(
    (h) => !/^src\/components\/interest-cart\/interest-cart\.css:\d+\s+--cart-(bull|bear):/.test(h),
  );
  assert.deepEqual(hits, [], `cart animal colours outside ${ANIMALS_FILE}:\n${hits.join("\n")}`);
});

test("each animal clears 3:1 on its three approved backgrounds, in both themes", () => {
  const law = readFileSync("docs/DESIGN_LANGUAGE.md", "utf8");
  const approved = law.slice(law.indexOf("**Approved backgrounds, and only these.**"), law.indexOf("**Measured**"));
  const listed = [...approved.matchAll(/`(#[0-9A-Fa-f]{6})`/g)].map((m) => m[1].toLowerCase());
  const lightBg = SURFACES.map((t) => resolve(light, t));
  const darkBg = SURFACES.map((t) => resolve(dark, t));
  for (const bg of [...lightBg, ...darkBg]) {
    assert.ok(listed.includes(bg), `the doc's approved backgrounds must list ${bg}`);
  }
  for (const [name, body] of [["bull", bullBody], ["bear", bearBody]] as const) {
    lightBg.forEach((bg, i) => {
      const r = ratio(body.light, bg);
      assert.ok(r >= 3, `${name} on light ${SURFACES[i]} (${bg}) is ${r.toFixed(2)}:1`);
    });
    darkBg.forEach((bg, i) => {
      const r = ratio(body.dark, bg);
      assert.ok(r >= 3, `${name} on dark ${SURFACES[i]} (${bg}) is ${r.toFixed(2)}:1`);
    });
  }
  const [bullMuzzle, bearMuzzle, features] = fixedParts;
  assert.ok(ratio(bullMuzzle, resolve(light, "--paper")) >= 3, "bull muzzle on paper");
  assert.ok(ratio(bearMuzzle, resolve(light, "--paper")) >= 3, "bear muzzle on paper");
  assert.ok(ratio(features, bearBody.light) >= 3 && ratio(features, bearBody.dark) >= 3, "the bear's eyes on its face");
});

test("no cart control relies on the animals alone: every button is labelled", () => {
  const tap = readFileSync("src/components/interest-cart/cart-tap-impl.tsx", "utf8");
  assert.match(tap, /aria-label=\{label\}/, "each cart tap button needs its spoken label");
  assert.match(tap, /Add a \$\{side\} tap for \$\{ticker\}/, "the label names the side and the ticker");
  assert.match(animalsSource, /aria-hidden/, "the artwork itself is decoration under the label");
});

test("while the cart is on, direction is ink; while it is off, stances keep green and red", () => {
  const block = (src: string, name: string) => {
    const at = src.indexOf(`const ${name}`);
    assert.ok(at >= 0, `missing ${name}`);
    return src.slice(at, src.indexOf("}", at));
  };
  const chip = readFileSync("src/components/ui/stance-chip.tsx", "utf8");
  assert.match(block(chip, "stanceStyle"), /text-gain[\s\S]*text-loss/, "off: the stance chip keeps gain and loss");
  assert.doesNotMatch(block(chip, "stanceInk"), /gain|loss|--up|--down/, "on: the stance chip is ink");
  const card = readFileSync("src/components/feed/stance-card.tsx", "utf8");
  assert.match(block(card, "directionTone"), /text-gain[\s\S]*text-loss/, "off: the Feed's direction word keeps gain and loss");
  assert.doesNotMatch(block(card, "directionInk"), /gain|loss/, "on: the Feed's direction word is ink");
  const vote = readFileSync("src/components/report/claim-vote-bar.tsx", "utf8");
  const pairs = [...vote.matchAll(/cartOn \? "(var\(--[\w-]+\))" : "(var\(--[\w-]+\))"/g)];
  assert.ok(pairs.length >= 4, "the vote bar's colours all switch with the cart");
  for (const [, on, off] of pairs) {
    assert.doesNotMatch(on, /--(up|down|gain|loss)/, `on: the vote bar uses ${on}`);
    assert.match(off, /--(up|down)/, `off: the vote bar keeps ${off}`);
  }
});

for (const [themeName, theme] of [["light", light], ["dark", dark]] as const) {
  test(`${themeName}: the cart's count badge (paper on ink) clears 4.5:1`, () => {
    const r = ratio(resolve(theme, "--paper"), resolve(theme, "--ink"));
    assert.ok(r >= 4.5, `--paper on --ink is ${r.toFixed(2)}:1`);
  });
}
