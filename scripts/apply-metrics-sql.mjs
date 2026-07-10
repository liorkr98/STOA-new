#!/usr/bin/env node
/**
 * Applies generated metrics SQL batch files via Supabase MCP-style execution.
 * Uses service role from Supabase CLI to run raw SQL through the REST SQL endpoint.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_REF = "cqhenicrfdkbsshyszex";
const BATCH_DIR = process.env.BATCH_DIR ?? "/tmp/metrics-batches";

function getServiceRoleKey() {
  const out = execSync(`pnpm dlx supabase projects api-keys --project-ref ${PROJECT_REF}`, {
    cwd: "/workspace/STOA-new",
    encoding: "utf8",
  });
  const data = JSON.parse(out);
  const key = data.keys?.find((k) => k.name === "service_role" || k.id === "service_role");
  if (!key?.api_key) throw new Error("service_role key not found");
  return key.api_key;
}

async function executeSql(query) {
  const key = getServiceRoleKey();
  const url = `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`;
  // Fallback: use pg meta API
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

function getAccessToken() {
  // Supabase CLI stores access token
  const home = process.env.HOME ?? "/home/ubuntu";
  const paths = [
    path.join(home, ".supabase/access-token"),
    path.join(home, ".config/supabase/access-token"),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8").trim();
  }
  throw new Error("Supabase access token not found");
}

async function main() {
  const files = fs.readdirSync(BATCH_DIR).filter((f) => f.endsWith(".sql")).sort();
  let applied = 0;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(BATCH_DIR, file), "utf8");
    await executeSql(sql);
    applied += 1;
    if (applied % 10 === 0) console.log(`Applied ${applied}/${files.length}`);
  }
  console.log(`Done. Applied ${applied} batch files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
