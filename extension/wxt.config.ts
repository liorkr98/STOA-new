import { defineConfig } from "wxt";

/**
 * The Stoa extension for YouTube. Permissions are deliberately narrow: the
 * YouTube host (to read the transcript and draw the card beside the video)
 * and storage (taps, the session, Quiet mode). Calls to Stoa go through
 * Stoa's own CORS allow-list for this extension's id, so no Stoa host
 * permission is needed.
 *
 * `key` pins the extension id (STOA_EXTENSION_ID in the app) so an unpacked
 * copy on any machine has the id the site talks to. It is a public key; the
 * private half is not in the repository and is not needed to load it.
 */
const STOA_ORIGIN = (process.env.WXT_STOA_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
/** Only the Stoa this build talks to may hand it a session or read its taps. */
const STOA_PAGES = STOA_ORIGIN.includes("stoamarket.ai")
  ? ["https://www.stoamarket.ai/*", "https://stoamarket.ai/*"]
  : [`${STOA_ORIGIN}/*`];

export default defineConfig({
  srcDir: "src",
  outDir: ".output",
  manifest: {
    name: "Stoa for YouTube",
    description: "Spot the stocks a YouTube video is discussing and add them to your Stoa Interest Cart.",
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA43399C7l5NPg1oqLpDvFIb13brfwupyGMaNhiK2DWx4eMDK7DaSD0Rpt2GYYBBPfAKUbJrLs4LxmVRdy2M6vkjxKaN3WtYHPy4lrQBkJZYY0BFZAquy8RpmEWE8kvJwrOZoDzSDCGExAcIGInpz6k4ePb3XWCSTnfRAsKu4nFoqvpJrynwBRx22rbeBKNhpg2WNZaMW8IWJmlQP5AX1hK/96imeBbiXqh9X3R3Q+dyALT0ZY3luyFRB0fJ/i37/N/ZodQ6ts2XMs2NF6LCBdip1sTNROZuLc2qEPXYMLwwXc+/pKIG2NMNhJBAWbG9lajYZ299yQP9cRZousnaSLfQIDAQAB",
    permissions: ["storage"],
    host_permissions: ["*://www.youtube.com/*"],
    externally_connectable: {
      matches: STOA_PAGES,
    },
    action: { default_title: "Stoa" },
    commands: {
      _execute_action: { suggested_key: { default: "Alt+Shift+S" }, description: "Open Stoa" },
      "toggle-quiet": { suggested_key: { default: "Alt+Shift+Q" }, description: "Turn Quiet mode on or off" },
    },
    web_accessible_resources: [{ resources: ["fonts/*.woff2"], matches: ["*://www.youtube.com/*"] }],
  },
  vite: () => ({
    define: { __STOA_ORIGIN__: JSON.stringify(STOA_ORIGIN) },
  }),
});
