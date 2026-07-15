import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key, { auth: { persistSession: false } });

async function checkTables() {
  const tables = ["tickers", "processed_webhook_events", "api_rate_limits", "analyst_applications", "contact_messages"];
  for (const t of tables) {
    const { error } = await db.from(t).select("*").limit(1);
    console.log(`${t}: ${error ? `MISSING — ${error.message}` : "OK"}`);
  }
}

async function makeAdmin() {
  const { data, error: listErr } = await db.auth.admin.listUsers();
  if (listErr) throw listErr;
  const owner = data.users.find((u) => u.email === "liorkr98@gmail.com");
  if (!owner) {
    console.log("liorkr98@gmail.com not found — sign up first, then re-run");
    return;
  }
  const { error } = await db.from("profiles").update({ role: "admin" }).eq("id", owner.id);
  if (error) throw error;
  console.log(`Set liorkr98@gmail.com → admin (${owner.id})`);
}

async function main() {
  const mode = process.argv[2] ?? "check";
  if (mode === "check") await checkTables();
  if (mode === "admin") await makeAdmin();
  if (mode === "all") {
    await checkTables();
    await makeAdmin();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
