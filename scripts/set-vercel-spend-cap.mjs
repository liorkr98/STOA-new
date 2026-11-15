#!/usr/bin/env node
/**
 * Cap Vercel on-demand spend at $1 per cycle and pause production at 100%.
 *
 * The Pro seat ($20) is billed separately. This budget only counts usage
 * beyond the monthly included credit, so $1 is the smallest hard stop that
 * still lets the included credit get used. Do not set a project budget:
 * that counts the credit itself and would pause the site early.
 *
 * Usage:
 *   VERCEL_TOKEN=xxx node scripts/set-vercel-spend-cap.mjs
 *
 * When the CLI prints a webhook secret, this script stores it as
 * VERCEL_SPEND_WEBHOOK_SECRET on the project and never logs the value.
 */
import { spawnSync } from "node:child_process";
import { sanitizeEnvValue } from "./sanitize-env-value.mjs";

const PROJECT_ID = "prj_S05cHjfIQVLDIygss1VM6CZuNIC0";
const TEAM_ID = "team_J9NF1ScSBAgtrKkAhVExRAIt";
const TEAM_SLUG = "liors-projects-7c36f7fa";
const AMOUNT = 1;
const WEBHOOK_URL = "https://www.stoamarket.ai/api/webhooks/vercel-spend";
const ENV_KEY = "VERCEL_SPEND_WEBHOOK_SECRET";
const API = "https://api.vercel.com";

function requireToken() {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error("Missing VERCEL_TOKEN. Create one at https://vercel.com/account/tokens");
    process.exit(1);
  }
  return token;
}

async function api(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body?.error?.message
        ? body.error.message
        : text || res.statusText;
    throw new Error(`${options.method ?? "GET"} ${path} → ${res.status}: ${msg}`);
  }
  return body;
}

function runVercel(token, args) {
  const result = spawnSync(
    "npx",
    ["--yes", "vercel@latest", ...args, "--scope", TEAM_SLUG, "--token", token, "--yes"],
    {
      encoding: "utf8",
      env: { ...process.env, VERCEL_TOKEN: token },
    },
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    const safe = output.replace(/Webhook secret:\s+\S+/gi, "Webhook secret: [redacted]");
    throw new Error(`vercel ${args.join(" ")} failed:\n${safe}`);
  }
  return output;
}

function extractWebhookSecret(output) {
  const match = output.match(/Webhook secret:\s+(\S+)/i);
  return match?.[1] ? sanitizeEnvValue(match[1]) : "";
}

function redact(output) {
  return output.replace(/Webhook secret:\s+\S+/gi, "Webhook secret: [stored on Vercel, not printed]");
}

async function upsertEnv(token, value) {
  const listed = await api(token, `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`);
  const envs = listed?.envs ?? listed ?? [];
  const existing = envs.find((row) => row.key === ENV_KEY);
  if (existing?.id) {
    await api(token, `/v9/projects/${PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`, {
      method: "DELETE",
    });
  }
  await api(token, `/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, {
    method: "POST",
    body: JSON.stringify({
      key: ENV_KEY,
      value,
      type: "sensitive",
      target: ["production", "preview"],
    }),
  });
}

async function main() {
  const token = requireToken();
  console.log(`Team: ${TEAM_SLUG}`);
  console.log(`Cap:  $${AMOUNT} on-demand overage, pause at 100%`);
  console.log(`Hook: ${WEBHOOK_URL}`);

  let inspect = "";
  try {
    inspect = runVercel(token, ["billing", "budgets", "inspect"]);
    console.log(redact(inspect).trim());
  } catch (err) {
    console.log(`Inspect skipped (${err.message.split("\n")[0]}). Creating the budget.`);
  }

  const alreadyCapped =
    inspect.includes("$1") &&
    /pause[^\n]*yes/i.test(inspect) &&
    inspect.includes(WEBHOOK_URL);

  if (alreadyCapped) {
    console.log("Budget already $1, paused at 100%, webhook attached. Nothing to change.");
    return;
  }

  const output = runVercel(token, [
    "billing",
    "budgets",
    "set",
    "--amount",
    String(AMOUNT),
    "--pause",
    "--webhook",
    WEBHOOK_URL,
  ]);
  console.log(redact(output).trim());

  const secret = extractWebhookSecret(output);
  if (secret) {
    await upsertEnv(token, secret);
    console.log(`Stored ${ENV_KEY} on the Vercel project (production + preview).`);
  } else {
    console.log(
      `No new webhook secret printed. If the hook was already set, ${ENV_KEY} stays as-is.`,
    );
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
