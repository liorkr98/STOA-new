import { STOA } from "@/lib/messages";

export class StoaError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A JSON call to Stoa. Stoa lets this extension's origin in by CORS; nothing else is needed. */
export async function stoaFetch<T>(path: string, init: RequestInit = {}, accessToken?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  const res = await fetch(`${STOA}${path}`, { ...init, headers });
  const body = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok) throw new StoaError(res.status, body?.message ?? `Stoa answered ${res.status}`);
  return body as T;
}
