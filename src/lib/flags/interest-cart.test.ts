/**
 * The Interest Cart's flag. Runs under `npm run test:cart` (react-server
 * condition, because the module is server-only). Delete at launch.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { interestCartFlag, interestCartOpenTo, parseInterestCartFlag } from "@/lib/flags/interest-cart";

test("unset, empty, off and anything unrecognised are all off", () => {
  for (const raw of [undefined, null, "", "off", "OFF", "true", "1", "yes", "allowlist:", "allowlist:not-an-email"]) {
    assert.deepEqual(parseInterestCartFlag(raw), { state: "off" }, String(raw));
  }
});

test("on is on for everyone, signed in or not", () => {
  assert.deepEqual(parseInterestCartFlag(" on "), { state: "on" });
  assert.equal(interestCartOpenTo(null, { state: "on" }), true);
  assert.equal(interestCartOpenTo("anyone@example.com", { state: "on" }), true);
});

test("an allowlist opens it to exactly those signed-in accounts", () => {
  const flag = parseInterestCartFlag("allowlist: Bar@StoaMarket.ai , second@example.com");
  assert.deepEqual(flag, { state: "allowlist", emails: ["bar@stoamarket.ai", "second@example.com"] });
  assert.equal(interestCartOpenTo("bar@stoamarket.ai", flag), true);
  assert.equal(interestCartOpenTo("BAR@stoamarket.ai", flag), true);
  assert.equal(interestCartOpenTo("someone@stoamarket.ai", flag), false);
  assert.equal(interestCartOpenTo(null, flag), false);
});

test("the module reads FEATURE_INTEREST_CART, and nothing else in src does", async () => {
  const before = process.env.FEATURE_INTEREST_CART;
  delete process.env.FEATURE_INTEREST_CART;
  assert.deepEqual(interestCartFlag(), { state: "off" });
  process.env.FEATURE_INTEREST_CART = "on";
  assert.deepEqual(interestCartFlag(), { state: "on" });
  if (before === undefined) delete process.env.FEATURE_INTEREST_CART;
  else process.env.FEATURE_INTEREST_CART = before;

  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = `${dir}/${name}`;
      return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : [];
    });
  const direct = walk("src").filter(
    (f) => !f.endsWith(".test.ts") && /process\.env(\.FEATURE_INTEREST_CART|\[["']FEATURE_INTEREST_CART)/.test(readFileSync(f, "utf8")),
  );
  assert.deepEqual(direct, ["src/lib/flags/interest-cart.ts"]);
});
