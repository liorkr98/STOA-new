/**
 * The cart follows a session the server wrote, without a reload. Sign-up
 * runs as a server action: it sets the session cookie and redirects, and the
 * browser's Supabase client, created before that while signed out, is never
 * told. The cart used to wait for onAuthStateChange and stayed signed out
 * until the page was reloaded.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const jar = new Map<string, string>();
const fakeDocument = {
  get cookie() {
    return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  },
  set cookie(line: string) {
    const [pair] = line.split(";");
    const at = pair.indexOf("=");
    const name = pair.slice(0, at).trim();
    const value = pair.slice(at + 1);
    if (/max-age=0/i.test(line) || value === "") jar.delete(name);
    else jar.set(name, value);
  },
};
// Node has a BroadcastChannel and it would hold the process open; tab-to-tab
// sync is not what this tests.
Object.assign(globalThis, { BroadcastChannel: undefined, document: fakeDocument, window: { document: fakeDocument, addEventListener: () => undefined, removeEventListener: () => undefined } });

const { createBrowserClient } = await import("@supabase/ssr");
const { readSessionUserId } = await import("@/lib/interest-cart/session");

const REF = "testref";
const COOKIE = `sb-${REF}-auth-token`;

/** What the server's sign-up writes: the session, base64url-encoded, in one cookie. */
function serverWritesSession(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: "header.payload.signature",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "refresh",
    user: { id: userId, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  };
  jar.set(COOKIE, `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`);
}

test("a session written by the server is seen by the same client, no reload", async () => {
  jar.clear();
  const client = createBrowserClient(`https://${REF}.supabase.co`, "anon-key", {
    isSingleton: false,
    auth: { autoRefreshToken: false, detectSessionInUrl: false },
  });
  const events: string[] = [];
  const { data } = client.auth.onAuthStateChange((event) => {
    if (event !== "INITIAL_SESSION") events.push(event);
  });

  assert.equal(await readSessionUserId(client), null, "signed out before sign-up");

  serverWritesSession("new-user");
  assert.equal(await readSessionUserId(client), "new-user", "the cart sees the new session on the next navigation");
  assert.deepEqual(events, [], "the client was never told, which is why the cart must ask");

  jar.delete(COOKIE);
  assert.equal(await readSessionUserId(client), null, "a server sign-out is seen the same way");
  data.subscription.unsubscribe();
});

test("a client that throws reads as signed out", async () => {
  const broken = { auth: { getSession: () => Promise.reject(new Error("offline")) } };
  assert.equal(await readSessionUserId(broken), null);
});
