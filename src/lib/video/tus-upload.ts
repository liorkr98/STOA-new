/**
 * Minimal Bunny Stream TUS uploader (Part 2.3), dependency-free. The browser
 * uploads straight to Bunny; the library API key never reaches the client (only
 * the short-lived presigned signature does). One PATCH sends the whole file --
 * fine for the <=90s teasers this flow produces -- with XHR progress events.
 *
 * Protocol: https://tus.io/protocols/resumable-upload + Bunny's presigned
 * authorization headers.
 */

export interface BunnyUploadSession {
  endpoint: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
}

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

export async function uploadToBunnyTus(
  file: Blob,
  session: BunnyUploadSession,
  meta: { title: string; filetype: string },
  onProgress?: (percent: number) => void,
): Promise<void> {
  const authHeaders: Record<string, string> = {
    AuthorizationSignature: session.authorizationSignature,
    AuthorizationExpire: String(session.authorizationExpire),
    VideoId: session.videoId,
    LibraryId: session.libraryId,
    "Tus-Resumable": "1.0.0",
  };

  // 1. Create the upload, get the resumable Location.
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
  const location = createRes.headers.get("Location");
  const uploadUrl = location
    ? new URL(location, session.endpoint).toString()
    : `${session.endpoint}/${session.videoId}`;

  // 2. PATCH the file bytes in one shot, reporting progress via XHR.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PATCH", uploadUrl, true);
    xhr.setRequestHeader("Tus-Resumable", "1.0.0");
    xhr.setRequestHeader("Upload-Offset", "0");
    xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");
    for (const [k, v] of Object.entries(authHeaders)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(file);
  });
}
