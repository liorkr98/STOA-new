import "./load-env";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  bunnyEnv,
  createBunnyVideo,
  deleteBunnyVideo,
  probeLibrary,
  uploadBunnyVideo,
  type BunnyEnv,
} from "./demo-video-bunny";
import type { ClipManifestEntry } from "./demo-video-generate";

/**
 * Pass 2 of the demo dataset, part two: push the generated clips to Bunny and
 * attach a `video_clips` row to each publication.
 *
 * Uploading needs no webhook. Bunny accepts the file and starts transcoding on
 * its own; the webhook only matters afterwards, to hear that transcoding
 * finished and flip the row to "ready". So clips land here in "processing" and
 * stay there until either the webhook is registered or
 * `demo:video:check -- --promote` polls for them.
 *
 * `published_at` is set now rather than later, and deliberately. The webhook
 * sets `status` and nothing else (see markVideoClipReadyByGuid), so a clip with
 * a null `published_at` would go ready and still never appear -- every
 * discovery query filters on `status = 'ready' AND published_at IS NOT NULL`.
 * Setting it here means the surfaces populate the moment the clips go ready,
 * with no second pass. It is dated to the publication it belongs to, so the
 * feed's chronology matches the publications' own.
 *
 * `thumbnail_url` and `preview_url` are left null until Bunny has actually
 * produced them. That is not an oversight: every call site falls back to
 * `PlaceholderThumb` when the thumbnail is null, so a processing clip shows the
 * analyst's placeholder rather than a broken image, and it is the same picture
 * the clip itself opens on.
 *
 * Everything written here is scoped to @stoa.demo accounts, so
 * `npm run demo:teardown` removes it -- the Bunny assets included; it reads the
 * GUIDs back out of these rows and deletes them from the library first.
 *
 * Run: npm run demo:video:upload
 * Rehearse: npm run demo:video:upload -- --dry-run
 * One clip: npm run demo:video:upload -- --limit 1
 */

const OUT_DIR = path.resolve(process.cwd(), "demo-clips");
const MANIFEST = path.join(OUT_DIR, "manifest.json");

/** Four at a time. Bunny takes more, but this keeps a failure legible and
 * leaves the library's transcoding queue in a sane state. */
const CONCURRENCY = 4;
const ATTEMPTS = 3;

interface Result {
  entry: ClipManifestEntry;
  guid?: string;
  error?: string;
}

/**
 * One clip, end to end. If the row cannot be written the Bunny asset is deleted
 * again: an asset with no row is invisible to teardown, which is exactly the
 * kind of thing that quietly accumulates in a paid library.
 */
async function pushOne(env: BunnyEnv, db: SupabaseClient, entry: ClipManifestEntry): Promise<Result> {
  const file = path.join(OUT_DIR, entry.file);
  let guid: string | undefined;
  let lastError = "";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      guid = await createBunnyVideo(env, `${entry.handle} - ${entry.title}`.slice(0, 200));
      await uploadBunnyVideo(env, guid, await readFile(file));
      break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (guid) await deleteBunnyVideo(env, guid);
      guid = undefined;
      if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  if (!guid) return { entry, error: lastError };

  const { error } = await db.from("video_clips").insert({
    report_id: entry.reportId,
    creator_id: entry.creatorId,
    bunny_video_guid: guid,
    playback_url: `https://${env.cdnHostname}/${guid}/playlist.m3u8`,
    thumbnail_url: null,
    preview_url: null,
    duration_seconds: entry.durationSeconds,
    status: "processing",
    published_at: entry.publishedAt,
  });
  if (error) {
    await deleteBunnyVideo(env, guid);
    return { entry, error: `database insert failed: ${error.message}` };
  }
  return { entry, guid };
}

async function pool<T, R>(items: T[], size: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const env = bunnyEnv();
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  let manifest: ClipManifestEntry[];
  try {
    manifest = JSON.parse(await readFile(MANIFEST, "utf8")) as ClipManifestEntry[];
  } catch {
    throw new Error(`No manifest at ${path.relative(process.cwd(), MANIFEST)}. Run npm run demo:video:generate first.`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase credentials are not set in .env.local.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  console.log(`Bunny library ${env.libraryId}`);
  const { count } = await probeLibrary(env);
  console.log(`Credentials accepted. ${count} video(s) already in the library.`);

  // Skip anything already attached, so a re-run after a partial failure resumes
  // instead of double-uploading.
  const { data: existing } = await db
    .from("video_clips")
    .select("report_id")
    .in("report_id", manifest.map((m) => m.reportId));
  const done = new Set((existing ?? []).map((r) => r.report_id as string));

  const pending: ClipManifestEntry[] = [];
  const missingFiles: string[] = [];
  for (const entry of manifest) {
    if (pending.length >= limit) break;
    if (done.has(entry.reportId)) continue;
    try {
      await stat(path.join(OUT_DIR, entry.file));
    } catch {
      missingFiles.push(entry.file);
      continue;
    }
    pending.push(entry);
  }

  if (missingFiles.length > 0) {
    console.log(`${missingFiles.length} manifest entries have no file on disk and are skipped.`);
  }
  if (done.size > 0) console.log(`${done.size} publications already have a clip and are skipped.`);
  if (pending.length === 0) {
    console.log("Nothing to upload.");
    return;
  }

  const totalBytes = (
    await Promise.all(pending.map(async (e) => (await stat(path.join(OUT_DIR, e.file))).size))
  ).reduce((a, b) => a + b, 0);
  console.log(
    `\n${pending.length} clips to upload, ${(totalBytes / 1024 / 1024).toFixed(0)} MB total.`,
  );

  if (dryRun) {
    for (const e of pending.slice(0, 10)) console.log(`  ${e.handle}  ${e.durationSeconds}s  ${e.file}`);
    if (pending.length > 10) console.log(`  ... and ${pending.length - 10} more`);
    console.log("\nDry run: nothing was uploaded and no rows were written.");
    return;
  }

  const started = Date.now();
  let done_ = 0;
  const results = await pool(pending, CONCURRENCY, async (entry) => {
    const r = await pushOne(env, db, entry);
    done_++;
    if (done_ % 10 === 0 || done_ === pending.length) {
      process.stdout.write(`  ${done_}/${pending.length}\n`);
    }
    return r;
  });

  const seconds = (Date.now() - started) / 1000;
  const ok = results.filter((r) => r.guid);
  const failed = results.filter((r) => r.error);

  console.log(`\n${ok.length} uploaded in ${seconds.toFixed(1)}s (${(seconds / Math.max(ok.length, 1)).toFixed(1)}s each).`);
  if (failed.length > 0) {
    console.log(`${failed.length} failed:`);
    for (const f of failed.slice(0, 10)) console.log(`  ${f.entry.file}: ${f.error}`);
    process.exitCode = 1;
  }
  console.log(
    "\nClips are in Bunny and rows are attached, all at status 'processing'.\n" +
      "They stay there until the Bunny webhook is registered (or demo:video:check -- --promote is run).",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
