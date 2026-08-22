import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { listDemoUsers } from "./demo-data";
import {
  bunnyEnv,
  getBunnyVideo,
  probeLibrary,
  MAX_VIDEO_DURATION_SECONDS,
  STATUS_NAMES,
} from "./demo-video-bunny";

/**
 * Read-only status of the demo video set: are the Bunny credentials good, and
 * where has each clip got to in Bunny's pipeline.
 *
 * Run it before uploading to fail fast on a bad key or an unreachable library,
 * and after uploading to see whether the webhook has been doing its job. Clips
 * sitting at "Finished" in Bunny but "processing" in the database is the whole
 * diagnosis: Bunny has done its part and nothing told us about it, which is
 * what an unregistered webhook looks like from here.
 *
 * `--promote` is the fallback for a world where registering the webhook turns
 * out to be awkward. It does by polling exactly what the webhook does on push:
 * reads each video's authoritative record from Bunny, enforces the same length
 * cap, writes the same CDN URLs, flips the finished ones to ready. It is the
 * one path in this script that writes; without the flag nothing is modified.
 *
 * Run: npm run demo:video:check
 * Fallback (writes): npm run demo:video:check -- --promote
 */

async function main() {
  const env = bunnyEnv();
  const promote = process.argv.includes("--promote");

  console.log(`Bunny library ${env.libraryId} via ${env.cdnHostname}`);
  const { count } = await probeLibrary(env);
  console.log(`Credentials accepted. ${count} video(s) currently in the library.\n`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Supabase credentials are not set, so the database side is not checked.");
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const demo = await listDemoUsers(db);
  const ids = demo.map((u) => u.id);
  const { data: clips } = await db
    .from("video_clips")
    .select("id, bunny_video_guid, status, published_at, duration_seconds")
    .in("creator_id", ids);

  if (!clips || clips.length === 0) {
    console.log("No demo clips in the database yet.");
    return;
  }

  const dbStatus = new Map<string, number>();
  const bunnyStatus = new Map<string, number>();
  let published = 0;
  let missingInBunny = 0;
  const finishedButNotReady: { guid: string; length: number }[] = [];

  for (const c of clips) {
    const s = c.status as string;
    dbStatus.set(s, (dbStatus.get(s) ?? 0) + 1);
    if (c.published_at) published++;
    const v = await getBunnyVideo(env, c.bunny_video_guid as string);
    if (!v) {
      missingInBunny++;
      continue;
    }
    const name = STATUS_NAMES[v.status] ?? String(v.status);
    bunnyStatus.set(name, (bunnyStatus.get(name) ?? 0) + 1);
    if (v.status === 4 && s !== "ready") finishedButNotReady.push({ guid: v.guid, length: v.length });
  }

  const fmt = (m: Map<string, number>) => [...m].map(([k, v]) => `${v} ${k}`).join(", ");
  console.log(`${clips.length} demo clips, ${published} with published_at set.`);
  console.log(`  in the database: ${fmt(dbStatus)}`);
  console.log(`  in Bunny:       ${fmt(bunnyStatus)}`);
  if (missingInBunny > 0) console.log(`  ${missingInBunny} referenced GUIDs no longer exist in Bunny.`);

  if (finishedButNotReady.length === 0) {
    console.log("\nNothing is finished-in-Bunny but unready in the database.");
    return;
  }

  console.log(
    `\n${finishedButNotReady.length} clip(s) have finished transcoding in Bunny but are still ` +
      `"processing" in the database. That is what the webhook would have fixed.`,
  );

  if (!promote) {
    console.log("Re-run with -- --promote to flip them to ready without the webhook.");
    return;
  }

  console.log("\nPromoting (the webhook's job, done by polling instead)...");
  let promoted = 0;
  let rejected = 0;
  for (const v of finishedButNotReady) {
    // The same length cap the webhook enforces, so the fallback cannot admit a
    // clip the push path would have rejected.
    const overLength = v.length > MAX_VIDEO_DURATION_SECONDS;
    const { error } = await db
      .from("video_clips")
      .update({
        playback_url: `https://${env.cdnHostname}/${v.guid}/playlist.m3u8`,
        thumbnail_url: overLength ? null : `https://${env.cdnHostname}/${v.guid}/thumbnail.jpg`,
        preview_url: overLength ? null : `https://${env.cdnHostname}/${v.guid}/preview.webp`,
        caption_vtt_url: overLength ? null : `https://${env.cdnHostname}/${v.guid}/captions/en.vtt`,
        duration_seconds: Math.round(v.length),
        status: overLength ? "failed" : "ready",
      })
      .eq("bunny_video_guid", v.guid);
    if (error) console.error(`  ${v.guid}: ${error.message}`);
    else if (overLength) rejected++;
    else promoted++;
  }
  console.log(`${promoted} marked ready${rejected > 0 ? `, ${rejected} rejected as over-length` : ""}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
