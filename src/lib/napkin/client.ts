import "server-only";

const BASE_URL = "https://api.napkin.ai";

export class NapkinApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "NapkinApiError";
  }
}

export interface NapkinCreateInput {
  format: "svg" | "png";
  content: string;
  context_before?: string | null;
  context_after?: string | null;
  language?: string;
  style_id?: string | null;
  visual_query?: string;
  number_of_visuals?: number;
  transparent_background?: boolean;
  width?: number;
}

export interface NapkinGeneratedFile {
  id?: string;
  url: string;
  format?: string;
}

export interface NapkinStatusResponse {
  id: string;
  status: "pending" | "completed" | "failed";
  generated_files?: NapkinGeneratedFile[];
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function napkinCreateVisual(
  token: string,
  input: NapkinCreateInput,
): Promise<{ id: string; status: string }> {
  const res = await fetch(`${BASE_URL}/v1/visual`, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new NapkinApiError(`Napkin create failed (${res.status})`, res.status, body);
  }

  return res.json() as Promise<{ id: string; status: string }>;
}

export async function napkinGetStatus(
  token: string,
  requestId: string,
): Promise<NapkinStatusResponse> {
  const res = await fetch(`${BASE_URL}/v1/visual/${requestId}/status`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new NapkinApiError(`Napkin status failed (${res.status})`, res.status, body);
  }

  return res.json() as Promise<NapkinStatusResponse>;
}

export async function napkinPollUntilComplete(
  token: string,
  requestId: string,
  opts?: { maxAttempts?: number },
): Promise<NapkinStatusResponse> {
  const maxAttempts = opts?.maxAttempts ?? 30;
  let delay = 2_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await napkinGetStatus(token, requestId);
    if (status.status === "completed") return status;
    if (status.status === "failed") {
      throw new NapkinApiError("Napkin generation failed", 500);
    }
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.5), 10_000);
  }

  throw new NapkinApiError("Napkin generation timed out", 504);
}

export async function napkinDownloadFile(token: string, fileUrl: string): Promise<Buffer> {
  const res = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new NapkinApiError(`Napkin download failed (${res.status})`, res.status, body);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function napkinGenerateAndDownload(
  token: string,
  input: NapkinCreateInput,
): Promise<{ requestId: string; files: NapkinGeneratedFile[]; buffers: Buffer[] }> {
  const created = await napkinCreateVisual(token, input);
  const completed = await napkinPollUntilComplete(token, created.id);
  const files = completed.generated_files ?? [];

  if (files.length === 0) {
    throw new NapkinApiError("Napkin returned no files", 500);
  }

  const buffers = await Promise.all(files.map((f) => napkinDownloadFile(token, f.url)));
  return { requestId: created.id, files, buffers };
}
