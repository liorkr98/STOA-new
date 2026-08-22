import "./load-env";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { listDemoUsers } from "./demo-data";
import {
  ANALYST_COLORS,
  analystColor,
  buildGeometry,
  createRenderer,
  WIDTH,
  HEIGHT,
} from "./demo-video-frames";

/**
 * Pass 2 of the demo dataset, part one: a stand-in clip for every demo
 * publication that should carry video.
 *
 * Explore and the Feed only surface publications with a clip attached, so
 * without this both surfaces are empty however much text pass 1 seeded. These
 * are not films. Each one is the analyst's `PlaceholderThumb` -- their colour,
 * their two-tone wash, the same abstract figure -- held for 30 to 85 seconds
 * with a slow drift of light across it. At tile size it reads as a person on
 * camera; at full size it is obviously a generated placeholder, which is what
 * a demo dataset should look like.
 *
 * Output goes to `demo-clips/`, which is gitignored: ~112 mp4s have no business
 * in the repo. Each file is named for its report id, so the upload step matches
 * clip to publication by name and never has to guess.
 *
 * Two stages, because the expensive part is the same for every clip of a given
 * colour. Eight colour masters are rendered pixel by pixel (one per entry in
 * ANALYST_COLORS), then each clip is that master looped to its own length. The
 * alternative -- rendering every frame of every clip -- is ~100x the work for
 * an identical result.
 *
 * Run: npm run demo:video:generate
 * One clip, for checking the look or the credentials: -- --limit 1
 */

const OUT_DIR = path.resolve(process.cwd(), "demo-clips");
const MASTER_DIR = path.join(OUT_DIR, ".masters");
const MANIFEST = path.join(OUT_DIR, "manifest.json");

/**
 * The webhook rejects anything over MAX_VIDEO_DURATION_SECONDS (90) using the
 * length Bunny reports, which is its own rounding of the container duration.
 * Stopping at 85 leaves that rounding somewhere harmless.
 */
const MIN_SECONDS = 30;
const MAX_SECONDS = 85;

/** Master loop length. The drift completes exactly one cycle over it, so the
 * seam where the loop repeats is the quietest point in the motion. */
const LOOP_SECONDS = 12;
const SOURCE_FPS = 15;
const OUTPUT_FPS = 24;

/** Most-recent publications per analyst. Three keeps every one of the 40
 * represented while landing inside the 80-120 the demo wants. */
const PER_ANALYST = 3;

export interface ClipManifestEntry {
  file: string;
  reportId: string;
  creatorId: string;
  handle: string;
  title: string;
  color: string;
  durationSeconds: number;
  publishedAt: string | null;
}

function run(cmd: string, args: string[], onStdin?: (stdin: NodeJS.WritableStream) => Promise<void>) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: [onStdin ? "pipe" : "ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
      if (err.length > 8000) err = err.slice(-8000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}\n${err}`));
    });
    if (onStdin) {
      onStdin(child.stdin).then(
        () => child.stdin.end(),
        (e) => {
          child.stdin.destroy();
          reject(e);
        },
      );
    }
  });
}

/** Backpressure-aware write. Without the drain wait, ~500MB of frames queues
 * in memory faster than ffmpeg drinks it. One `drain` listener per blocked
 * write and no error listener: the caller owns the stream's error handling, and
 * adding one here per frame trips Node's max-listener warning within a second. */
function write(stream: NodeJS.WritableStream, chunk: Buffer): Promise<void> {
  if (stream.write(chunk)) return Promise.resolve();
  return new Promise((resolve) => stream.once("drain", resolve));
}

async function renderMaster(colorHex: string, index: number, geo: ReturnType<typeof buildGeometry>) {
  const file = path.join(MASTER_DIR, `master-${index}.mp4`);
  const render = createRenderer(geo, colorHex);
  const frames = LOOP_SECONDS * SOURCE_FPS;

  await run(
    "ffmpeg",
    [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "rawvideo", "-pix_fmt", "rgb24",
      "-s", `${WIDTH}x${HEIGHT}`, "-framerate", String(SOURCE_FPS),
      "-i", "-",
      // The master is re-encoded once more per clip, so it is kept close to
      // lossless here; a cheap master would compound its own banding.
      "-c:v", "libx264", "-preset", "slow", "-crf", "16",
      "-pix_fmt", "yuv420p", "-r", String(OUTPUT_FPS),
      file,
    ],
    async (stdin) => {
      for (let f = 0; f < frames; f++) await write(stdin, render(f / frames));
    },
  );
  return file;
}

/**
 * One clip: the colour's master looped and cut to length, with a silent stereo
 * track so Bunny receives a well-formed A/V file rather than a video-only one.
 */
async function renderClip(master: string, seconds: number, out: string) {
  await run("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-stream_loop", "-1", "-i", master,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "64k",
    "-t", String(seconds),
    "-movflags", "+faststart",
    out,
  ]);
}

/**
 * Deterministic length per report, so re-running produces the same clip rather
 * than a new one, and the spread does not depend on when the script last ran.
 */
function durationFor(reportId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < reportId.length; i++) {
    h ^= reportId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  return MIN_SECONDS + ((h >>> 0) % (MAX_SECONDS - MIN_SECONDS + 1));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("your-project-ref") || key.startsWith("your-")) {
    throw new Error("Supabase credentials are not set in .env.local.");
  }

  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  const db = createClient(url, key, { auth: { persistSession: false } });
  const demo = await listDemoUsers(db);
  const ids = demo.map((u) => u.id);
  if (ids.length === 0) throw new Error("No @stoa.demo accounts. Run npm run demo:seed first.");

  const { data: profiles } = await db.from("profiles").select("id, handle").in("id", ids);
  const handles = new Map((profiles ?? []).map((p) => [p.id as string, p.handle as string]));

  const { data: reports, error } = await db
    .from("reports")
    .select("id, author_id, title, published_at")
    .in("author_id", ids)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`Could not read publications: ${error.message}`);

  // Already-attached clips are skipped, so a re-run tops the set up rather than
  // duplicating it. They also count toward the per-analyst cap: without that,
  // a second run would hand an analyst three more on top of the three they have.
  const { data: existing } = await db
    .from("video_clips")
    .select("report_id, creator_id")
    .in("creator_id", ids);
  const taken = new Set((existing ?? []).map((r) => r.report_id as string));

  const perAnalyst = new Map<string, number>();
  for (const r of existing ?? []) {
    const author = r.creator_id as string;
    perAnalyst.set(author, (perAnalyst.get(author) ?? 0) + 1);
  }
  const chosen: ClipManifestEntry[] = [];
  for (const r of reports ?? []) {
    if (chosen.length >= limit) break;
    const author = r.author_id as string;
    if (taken.has(r.id as string)) continue;
    const used = perAnalyst.get(author) ?? 0;
    if (used >= PER_ANALYST) continue;
    perAnalyst.set(author, used + 1);
    chosen.push({
      file: `${r.id}.mp4`,
      reportId: r.id as string,
      creatorId: author,
      handle: handles.get(author) ?? "unknown",
      title: (r.title as string) ?? "",
      color: analystColor(author),
      durationSeconds: durationFor(r.id as string),
      publishedAt: (r.published_at as string) ?? null,
    });
  }

  if (chosen.length === 0) {
    console.log("Every demo publication in scope already has a clip. Nothing to generate.");
    return;
  }

  console.log(
    `${chosen.length} clips to generate for ${perAnalyst.size} analysts ` +
      `(${MIN_SECONDS}-${MAX_SECONDS}s, ${WIDTH}x${HEIGHT}).`,
  );

  await rm(MASTER_DIR, { recursive: true, force: true });
  await mkdir(MASTER_DIR, { recursive: true });

  const needed = [...new Set(chosen.map((c) => c.color))];
  console.log(`Rendering ${needed.length} colour masters (${LOOP_SECONDS}s each)...`);
  const startMasters = Date.now();
  const geo = buildGeometry();
  const masters = new Map<string, string>();
  for (const color of needed) {
    const index = ANALYST_COLORS.indexOf(color as (typeof ANALYST_COLORS)[number]);
    masters.set(color, await renderMaster(color, index, geo));
    process.stdout.write(`  ${color}\n`);
  }
  console.log(`Masters done in ${((Date.now() - startMasters) / 1000).toFixed(1)}s.`);

  console.log(`Rendering ${chosen.length} clips...`);
  const startClips = Date.now();
  let bytes = 0;
  for (let i = 0; i < chosen.length; i++) {
    const c = chosen[i];
    const out = path.join(OUT_DIR, c.file);
    await renderClip(masters.get(c.color)!, c.durationSeconds, out);
    bytes += (await stat(out)).size;
    if ((i + 1) % 10 === 0 || i === chosen.length - 1) {
      process.stdout.write(`  ${i + 1}/${chosen.length}\n`);
    }
  }
  const clipSeconds = (Date.now() - startClips) / 1000;

  await writeFile(MANIFEST, JSON.stringify(chosen, null, 2));
  await rm(MASTER_DIR, { recursive: true, force: true });

  const total = chosen.reduce((s, c) => s + c.durationSeconds, 0);
  console.log(
    `\n${chosen.length} clips in ${clipSeconds.toFixed(1)}s, ` +
      `${(bytes / 1024 / 1024).toFixed(0)} MB total, ` +
      `${Math.floor(total / 60)}m${total % 60}s of footage.`,
  );
  console.log(`Manifest: ${path.relative(process.cwd(), MANIFEST)}`);
  console.log("Next: npm run demo:video:upload");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
