#!/usr/bin/env node
/**
 * Repairs CRON_SECRET on Vercel when it contains trailing newlines or other
 * control characters (build error: "control character (0x0a) at position …").
 *
 * Usage:
 *   VERCEL_TOKEN=xxx node scripts/fix-vercel-cron-secret.mjs
 *   VERCEL_TOKEN=xxx node scripts/fix-vercel-cron-secret.mjs --rotate
 *
 * --rotate  generate a fresh secret instead of trimming the existing value
 */
import { randomBytes } from "node:crypto";
import { hasInvalidHeaderChars, sanitizeEnvValue } from "./sanitize-env-value.mjs";

const PROJECT_ID = "prj_S05cHjfIQVLDIygss1VM6CZuNIC0";
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
      typeof body === "object" && body?.error?.message ? body.error.message : text || res.statusText;
    throw new Error(`${options.method ?? "GET"} ${path} → ${res.status}: ${msg}`);
  }
  return body;
}

async function main() {
  const token = requireToken();
  const rotate = process.argv.includes("--rotate");

  const project = await api(token, `/v9/projects/${PROJECT_ID}`);
  const teamId = project.accountId;
  const team = teamId ? `?teamId=${teamId}` : "";

  const envs = await api(token, `/v9/projects/${PROJECT_ID}/env${team}`);
  const list = envs?.envs ?? envs ?? [];
  const cron = list.find((e) => e.key === "CRON_SECRET");
  if (!cron) {
    console.error("CRON_SECRET is not set on this Vercel project.");
    process.exit(1);
  }

  let clean;
  if (rotate) {
    clean = randomBytes(32).toString("hex");
    console.log("Generating a new CRON_SECRET (--rotate).");
  } else {
    const decrypted = await api(token, `/v9/projects/${PROJECT_ID}/env/${cron.id}${team}`);
    const raw = decrypted.value ?? "";
    if (hasInvalidHeaderChars(raw)) {
      console.log("Found invalid control characters in CRON_SECRET — will sanitize.");
    } else {
      console.log("CRON_SECRET looks clean already. Use --rotate to replace it.");
      return;
    }
    clean = sanitizeEnvValue(raw);
    if (!clean) {
      console.error("Sanitized CRON_SECRET is empty. Re-run with --rotate.");
      process.exit(1);
    }
  }

  await api(token, `/v9/projects/${PROJECT_ID}/env/${cron.id}${team}`, { method: "DELETE" });
  await api(token, `/v10/projects/${PROJECT_ID}/env${team}`, {
    method: "POST",
    body: JSON.stringify({
      key: "CRON_SECRET",
      value: clean,
      type: "sensitive",
      target: cron.target ?? ["production"],
    }),
  });

  console.log(`Updated CRON_SECRET on Vercel (length ${clean.length}). Redeploy production to apply.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
