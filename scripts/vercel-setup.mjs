#!/usr/bin/env node
/**
 * Configure Vercel project env vars and trigger a production deploy.
 *
 * Usage:
 *   VERCEL_TOKEN=xxx node scripts/vercel-setup.mjs
 *   VERCEL_TOKEN=xxx node scripts/vercel-setup.mjs --deploy --ref main
 *
 * Reads secrets from .env.local (repo root). Never commit that file.
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ID = "prj_S05cHjfIQVLDIygss1VM6CZuNIC0";
const GITHUB_REPO = "liorkr98/STOA-new";
const API = "https://api.vercel.com";

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

function requireToken() {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error(
      "Missing VERCEL_TOKEN. Create one at https://vercel.com/account/tokens",
    );
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

const ENV_SPECS = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    targets: ["production", "preview", "development"],
    sensitive: false,
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    targets: ["production", "preview", "development"],
    sensitive: false,
  },
  {
    key: "SUPABASE_STORAGE_URL",
    required: true,
    targets: ["production", "preview", "development"],
    sensitive: false,
    derive: (env) =>
      env.SUPABASE_STORAGE_URL ||
      (env.NEXT_PUBLIC_SUPABASE_URL
        ? `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`
        : ""),
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    targets: ["production", "preview"],
    sensitive: true,
  },
  {
    key: "CRON_SECRET",
    required: true,
    targets: ["production"],
    sensitive: true,
    derive: (env) =>
      env.CRON_SECRET && env.CRON_SECRET !== "change-me-to-a-long-random-string"
        ? env.CRON_SECRET
        : randomBytes(32).toString("hex"),
  },
  {
    key: "OPENAI_MODEL",
    required: false,
    targets: ["production", "preview", "development"],
    sensitive: false,
    defaultValue: "gpt-4o-mini",
  },
  {
    key: "OPENAI_API_KEY",
    required: false,
    targets: ["production", "preview"],
    sensitive: true,
  },
  {
    key: "NAPKIN_API_KEY",
    required: false,
    targets: ["production", "preview"],
    sensitive: true,
  },
];

async function listEnv(token, projectId, teamId) {
  const team = teamId ? `?teamId=${teamId}` : "";
  return api(token, `/v9/projects/${projectId}/env${team}`);
}

async function createEnv(token, projectId, teamId, spec, value) {
  const team = teamId ? `?teamId=${teamId}` : "";
  return api(token, `/v10/projects/${projectId}/env${team}`, {
    method: "POST",
    body: JSON.stringify({
      key: spec.key,
      value,
      type: spec.sensitive ? "sensitive" : "encrypted",
      target: spec.targets,
    }),
  });
}

async function linkGitHub(token, projectId, teamId) {
  const team = teamId ? `?teamId=${teamId}` : "";
  return api(token, `/v9/projects/${projectId}${team}`, {
    method: "PATCH",
    body: JSON.stringify({
      gitRepository: {
        type: "github",
        repo: GITHUB_REPO,
      },
    }),
  });
}

async function createDeployment(token, projectId, teamId, ref) {
  const team = teamId ? `?teamId=${teamId}` : "";
  return api(token, `/v13/deployments${team}`, {
    method: "POST",
    body: JSON.stringify({
      name: "stoa-new",
      project: projectId,
      target: "production",
      gitSource: {
        type: "github",
        ref,
        repo: GITHUB_REPO,
      },
    }),
  });
}

async function main() {
  const token = requireToken();
  const deploy = process.argv.includes("--deploy");
  const refArg = process.argv.find((a) => a.startsWith("--ref="));
  const ref = refArg ? refArg.split("=")[1] : "main";

  const localEnv = parseEnvFile(join(root, ".env.local"));
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`GitHub:  ${GITHUB_REPO}`);

  const project = await api(token, `/v9/projects/${PROJECT_ID}`);
  const teamId = project.accountId;
  console.log(`Name:    ${project.name}`);
  console.log(`Team:    ${teamId}`);
  if (project.link?.type === "github") {
    console.log(`Linked:  ${project.link.repo}`);
  } else {
    console.log("Linking GitHub repository…");
    try {
      await linkGitHub(token, PROJECT_ID, teamId);
      console.log(`Linked:  ${GITHUB_REPO}`);
    } catch (err) {
      console.warn(`Git link skipped: ${err.message}`);
      console.warn(
        "Connect liorkr98/STOA-new in the Vercel dashboard if not already linked.",
      );
    }
  }

  const existing = await listEnv(token, PROJECT_ID, teamId);
  const existingKeys = new Set(
    (existing?.envs ?? existing ?? []).map((e) => e.key),
  );

  for (const spec of ENV_SPECS) {
    let value =
      spec.derive?.(localEnv) ??
      localEnv[spec.key] ??
      spec.defaultValue ??
      "";

    if (!value && spec.required) {
      console.error(`Missing required value for ${spec.key} in .env.local`);
      process.exit(1);
    }
    if (!value) {
      console.log(`Skip ${spec.key} (optional, empty)`);
      continue;
    }
    if (existingKeys.has(spec.key)) {
      console.log(`Keep ${spec.key} (already set on Vercel)`);
      continue;
    }
    await createEnv(token, PROJECT_ID, teamId, spec, value);
    console.log(`Set  ${spec.key} → ${spec.targets.join(", ")}`);
  }

  // Write .vercel/project.json for local CLI
  const vercelDir = join(root, ".vercel");
  const projectJson = {
    projectId: PROJECT_ID,
    orgId: teamId,
    projectName: project.name,
  };
  mkdirSync(vercelDir, { recursive: true });
  writeFileSync(
    join(vercelDir, "project.json"),
    `${JSON.stringify(projectJson, null, 2)}\n`,
  );
  console.log("Wrote .vercel/project.json");

  if (deploy) {
    console.log(`Deploying production from ref ${ref}…`);
    const deployment = await createDeployment(token, PROJECT_ID, teamId, ref);
    const url = deployment?.url
      ? `https://${deployment.url}`
      : deployment?.alias?.[0] ?? "(see Vercel dashboard)";
    console.log(`Deployment: ${url}`);
    console.log(`Inspector:  https://vercel.com/${deployment.inspectorUrl ?? ""}`);
  } else {
    console.log("\nDone. Run with --deploy --ref=main to trigger production deploy.");
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
