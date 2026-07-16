#!/usr/bin/env node
/**
 * Verify Slack webhooks and Sentry DSN from .env.local (never prints secret values).
 *
 * Usage: node scripts/verify-integrations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const SLACK_KEYS = [
  ["SLACK_WEBHOOK_SUPPORT", "#support"],
  ["SLACK_WEBHOOK_CUSTOMERS_OPS", "#customers-ops"],
  ["SLACK_WEBHOOK_REVENUE", "#revenue"],
  ["SLACK_WEBHOOK_MARKETING", "#marketing"],
  ["SLACK_WEBHOOK_BUGS", "#bugs"],
  ["SLACK_WEBHOOK_OPS", "#ops"],
  ["SLACK_CONTACT_WEBHOOK_URL", "#support (legacy)"],
];

async function testWebhook(label, url) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `Stoa integration verify: ${label}` }),
  }).catch(() => null);

  return Boolean(res?.ok);
}

async function main() {
  const env = { ...process.env, ...parseEnvFile(join(root, ".env.local")) };
  let failed = 0;

  const dsn = env.NEXT_PUBLIC_SENTRY_DSN || env.SENTRY_DSN;
  console.log(`Sentry DSN: ${dsn ? "configured" : "missing"}`);

  for (const [key, label] of SLACK_KEYS) {
    const url = env[key]?.trim();
    if (!url) {
      console.log(`Slack ${label}: skip (${key} not set)`);
      continue;
    }
    const ok = await testWebhook(label, url);
    console.log(`Slack ${label}: ${ok ? "ok" : "FAILED"}`);
    if (!ok) failed += 1;
  }

  if (failed > 0) process.exit(1);
  console.log("\nAll configured integrations responded OK.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
