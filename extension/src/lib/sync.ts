import { StoaError, stoaFetch } from "@/lib/api";
import type { BridgeRequest, BridgeTap } from "@/lib/bridge";
import { readStored, writeStored } from "@/lib/store";
import type { LocalTap, StoaSession } from "@/lib/types";

/** A session close to running out is renewed first. */
const RENEW_WITHIN_S = 120;

/** The extension's own session, renewed when needed; null once Stoa says sign in again. */
export async function liveSession(): Promise<StoaSession | null> {
  const { session } = await readStored();
  if (!session) return null;
  if (session.expiresAt - Date.now() / 1000 > RENEW_WITHIN_S) return session;
  try {
    const fresh = await stoaFetch<StoaSession>("/api/extension/session/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    await writeStored({ session: fresh });
    return fresh;
  } catch (e) {
    if (e instanceof StoaError && e.status === 401) await writeStored({ session: null });
    return null;
  }
}

let flushing: Promise<void> | null = null;

/**
 * Sends every tap not yet accepted to Stoa for the signed-in reader: taps
 * made while signed out are claimed for them first. A failed send leaves the
 * taps held, and the next tap or visit to Stoa tries again.
 */
export function flushTaps(): Promise<void> {
  flushing ??= (async () => {
    try {
      const session = await liveSession();
      if (!session) return;
      const { taps } = await readStored();
      const pending = taps.filter((t) => t.status === "held" && !t.undone && (t.userId === null || t.userId === session.userId));
      if (pending.length === 0) return;
      const res = await stoaFetch<{ accepted: { id: string }[]; refused: string[] }>(
        "/api/extension/taps",
        {
          method: "POST",
          body: JSON.stringify({
            taps: pending.slice(0, 100).map((t) => ({
              id: t.id,
              ticker: t.ticker,
              direction: t.direction,
              videoId: t.videoId,
              videoChannel: t.videoChannel,
              videoSeconds: t.videoSeconds,
              at: t.at,
            })),
          }),
        },
        session.accessToken,
      );
      const accepted = new Set(res.accepted.map((a) => a.id));
      const refused = new Set(res.refused);
      const latest = (await readStored()).taps;
      await writeStored({
        taps: latest
          .filter((t) => !refused.has(t.id))
          .map((t): LocalTap => (accepted.has(t.id) ? { ...t, userId: session.userId, status: "sent" } : t)),
      });
    } catch (e) {
      if (e instanceof StoaError && e.status === 401) await writeStored({ session: null });
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

const toBridge = (t: LocalTap): BridgeTap => ({
  id: t.id,
  ticker: t.ticker,
  direction: t.direction,
  videoId: t.videoId,
  videoChannel: t.videoChannel,
  videoSeconds: t.videoSeconds,
  createdAt: t.at,
});

/** Delivered taps older than this are forgotten; the cart has them. */
const KEEP_DELIVERED_MS = 8 * 86_400_000;

/** A Stoa page asking. Only the signed-in reader's own taps ever leave. */
export async function answerSite(request: BridgeRequest): Promise<unknown> {
  switch (request.type) {
    case "stoa:hello": {
      const { session } = await readStored();
      return { version: browser.runtime.getManifest().version, userId: session?.userId ?? null };
    }
    case "stoa:session": {
      const s = request.session;
      if (!s?.accessToken || !s.refreshToken || !s.userId) return { ok: false };
      const stored = await readStored();
      // Someone else signing in on this browser does not inherit the last reader's taps.
      const taps = stored.session && stored.session.userId !== s.userId ? stored.taps.filter((t) => t.userId === null) : stored.taps;
      await writeStored({ session: s, taps, siteWeek: stored.siteWeek?.userId === s.userId ? stored.siteWeek : null });
      await flushTaps();
      return { ok: true };
    }
    case "stoa:pull": {
      const { session, taps } = await readStored();
      if (!session || session.userId !== request.userId) return { taps: [], undos: [] };
      const mine = taps.filter((t) => t.userId === session.userId);
      // Undone before the site saw them: never sent across, simply settled here.
      const settled = new Set(mine.filter((t) => t.status === "sent" && t.undone).map((t) => t.id));
      if (settled.size) {
        await writeStored({ taps: taps.map((t) => (settled.has(t.id) ? { ...t, status: "delivered", undoDelivered: true } : t)) });
      }
      return {
        taps: mine.filter((t) => t.status === "sent" && !t.undone).map(toBridge),
        undos: mine.filter((t) => t.status === "delivered" && t.undone && !t.undoDelivered).map((t) => ({ id: t.id, ticker: t.ticker })),
      };
    }
    case "stoa:ack": {
      const { session, taps } = await readStored();
      if (!session || session.userId !== request.userId) return { ok: false };
      const delivered = new Set(request.delivered);
      const undone = new Set(request.undone);
      const now = Date.now();
      await writeStored({
        taps: taps
          .map((t) => (delivered.has(t.id) ? { ...t, status: "delivered" as const } : undone.has(t.id) ? { ...t, undoDelivered: true } : t))
          .filter((t) => t.status !== "delivered" || now - new Date(t.at).getTime() < KEEP_DELIVERED_MS),
        siteWeek: { userId: request.userId, weekStart: request.week.weekStart, rows: request.week.rows, syncedAt: new Date().toISOString() },
      });
      return { ok: true };
    }
  }
}
