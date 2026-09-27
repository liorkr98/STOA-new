/**
 * In-app back, the way Instagram, TikTok and CapCut do it: pop the history
 * stack when this screen was opened from inside the app, otherwise go to a
 * known parent.
 *
 * Whether there is a same-app page behind this one is our own bookkeeping.
 * This used to read an `idx` from `history.state`, which the Pages Router
 * kept and the App Router does not, so the answer was always no and every
 * Back went to its fallback. Instead every entry carries its depth in the
 * app (`DEPTH_KEY`): `installHistoryDepth` wraps `pushState` and
 * `replaceState`, so a pushed entry is one deeper than the one it covers and
 * a replaced one keeps its depth, whoever pushes (the router, Explore's
 * `?watch=`, the stories overlay). Guessing from the address cannot tell a
 * new entry from a rewritten one.
 */

export const HISTORY_BACK = "__history_back__";
export const DEPTH_KEY = "stoaDepth";

type HistoryState = Record<string, unknown> | null | undefined;

const depthOf = (state: unknown): number | null => {
  const d = (state as HistoryState)?.[DEPTH_KEY];
  return typeof d === "number" ? d : null;
};

/** The state to store for an entry at `depth`. Non-object states are replaced by the stamp. */
export function withDepth(data: unknown, depth: number): Record<string, unknown> {
  return data && typeof data === "object" ? { ...(data as Record<string, unknown>), [DEPTH_KEY]: depth } : { [DEPTH_KEY]: depth };
}

let installed = false;

/** Wraps the History API once so every entry is stamped with its depth. Client-only. */
export function installHistoryDepth(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const h = window.history;
  const push = h.pushState;
  const replace = h.replaceState;
  const here = () => depthOf(h.state) ?? 0;
  if (depthOf(h.state) === null) replace.call(h, withDepth(h.state, 0), "");
  h.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
    return push.call(this, withDepth(data, here() + 1), unused, url);
  };
  h.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
    return replace.call(this, withDepth(data, depthOf(data) ?? here()), unused, url);
  };
}

export function canPopHistory(
  state: HistoryState = typeof window === "undefined" ? null : (window.history.state as HistoryState),
): boolean {
  const d = depthOf(state);
  return d !== null && d > 0;
}

export function resolveLeaveHref(opts: {
  wantsBack: boolean;
  canPop: boolean;
  pathname: string;
  search: string;
  hash: string;
}): string {
  if (opts.wantsBack && opts.canPop) return HISTORY_BACK;
  return opts.pathname + opts.search + opts.hash;
}

export function leaveHrefFromAnchor(a: HTMLAnchorElement, origin: string): string {
  const url = new URL(a.href, origin);
  return resolveLeaveHref({
    wantsBack: a.hasAttribute("data-stoa-back"),
    canPop: canPopHistory(),
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  });
}

export function goToLeaveHref(
  router: { back: () => void; push: (href: string) => void },
  href: string,
): void {
  if (href === HISTORY_BACK) router.back();
  else router.push(href);
}
