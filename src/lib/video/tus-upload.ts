/**
 * Minimal Bunny Stream TUS uploader (Part 2.3), dependency-free. The browser
 * uploads straight to Bunny; the library API key never reaches the client (only
 * the short-lived presigned signature does).
 *
 * Protocol: https://tus.io/protocols/resumable-upload + Bunny's presigned
 * authorization headers. PATCH is chunked so a dropped mobile connection
 * loses one window, not the whole file, and every window must report
 * Upload-Offset. A missing offset used to be treated as success, which is how
 * Compose could say the upload finished while Bunny stored nothing.
 */

export interface BunnyUploadSession {
  endpoint: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
}

/** 4 MiB. Large enough to keep round-trips down, small enough for a phone. */
export const TUS_CHUNK_BYTES = 4 * 1024 * 1024;

const PATCH_ATTEMPTS = 3;

function toBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function encodeMetadata(meta: Record<string, string>): string {
  return Object.entries(meta)
    .map(([k, v]) => `${k} ${toBase64Utf8(v)}`)
    .join(",");
}

/** Bunny's create response must name the resume URL. Guessing `${endpoint}/${videoId}` stores nothing. */
export function tusResumeUrl(endpoint: string, location: string | null | undefined): string {
  const value = location?.trim();
  if (!value) throw new Error("Upload could not be created (no resume URL).");
  return new URL(value, endpoint).toString();
}

export function tusChunkEnd(offset: number, fileSize: number, chunkSize = TUS_CHUNK_BYTES): number {
  if (offset < 0 || fileSize < 0 || offset > fileSize) {
    throw new Error("Invalid upload range.");
  }
  return Math.min(offset + chunkSize, fileSize);
}

function readOffset(headers: { get(name: string): string | null }): number | null {
  const raw = headers.get("Upload-Offset");
  if (raw == null || raw === "") return null;
  const offset = Number(raw);
  return Number.isFinite(offset) ? offset : null;
}

function requireOffset(headers: { get(name: string): string | null }, expected: number): number {
  const offset = readOffset(headers);
  if (offset == null) throw new Error("Upload did not confirm progress.");
  if (offset !== expected) throw new Error("Upload did not finish.");
  return offset;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function patchChunk(
  uploadUrl: string,
  authHeaders: Record<string, string>,
  chunk: Blob,
  offset: number,
  fileSize: number,
  onProgress?: (percent: number) => void,
): Promise<number> {
  const expected = offset + chunk.size;
  return new Promise<number>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PATCH", uploadUrl, true);
    xhr.setRequestHeader("Upload-Offset", String(offset));
    xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");
    for (const [k, v] of Object.entries(authHeaders)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round(((offset + e.loaded) / fileSize) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed (${xhr.status}). ${xhr.responseText ?? ""}`.trim()));
        return;
      }
      try {
        resolve(
          requireOffset({ get: (name) => xhr.getResponseHeader(name) }, expected),
        );
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(chunk);
  });
}

async function confirmedOffset(
  uploadUrl: string,
  authHeaders: Record<string, string>,
  expected: number,
): Promise<number> {
  const head = await fetch(uploadUrl, { method: "HEAD", headers: authHeaders });
  return requireOffset(head.headers, expected);
}

export async function uploadToBunnyTus(
  file: Blob,
  session: BunnyUploadSession,
  meta: { title: string; filetype: string },
  onProgress?: (percent: number) => void,
): Promise<void> {
  if (file.size < 1) throw new Error("The video file is empty.");

  const authHeaders: Record<string, string> = {
    AuthorizationSignature: session.authorizationSignature,
    AuthorizationExpire: String(session.authorizationExpire),
    VideoId: session.videoId,
    LibraryId: session.libraryId,
    "Tus-Resumable": "1.0.0",
  };

  const createRes = await fetch(session.endpoint, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Upload-Length": String(file.size),
      "Upload-Metadata": encodeMetadata({ filetype: meta.filetype, title: meta.title }),
    },
  });
  if (createRes.status !== 201) {
    throw new Error(`Upload could not be created (${createRes.status}).`);
  }
  const uploadUrl = tusResumeUrl(session.endpoint, createRes.headers.get("Location"));

  let offset = 0;
  while (offset < file.size) {
    const end = tusChunkEnd(offset, file.size);
    const chunk = file.slice(offset, end);
    let advanced = false;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= PATCH_ATTEMPTS; attempt++) {
      try {
        offset = await patchChunk(uploadUrl, authHeaders, chunk, offset, file.size, onProgress);
        advanced = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Upload failed.");
        try {
          const head = await fetch(uploadUrl, { method: "HEAD", headers: authHeaders });
          const landed = readOffset(head.headers);
          if (landed != null && landed > offset) {
            offset = landed;
            advanced = true;
            break;
          }
        } catch {
          // Keep the PATCH error; another attempt may still land the chunk.
        }
        if (attempt < PATCH_ATTEMPTS) await sleep(300 * attempt);
      }
    }
    if (!advanced) throw lastError ?? new Error("Upload failed.");
  }

  await confirmedOffset(uploadUrl, authHeaders, file.size);
  onProgress?.(100);
}
