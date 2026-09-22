/**
 * In-app back, the way Instagram, TikTok and CapCut do it: pop the history
 * stack when this screen was opened from inside the app, otherwise go to a
 * known parent. Next's App Router stores a monotonically increasing `idx` on
 * `history.state`; idx > 0 means there is a same-app page behind this one.
 */

export const HISTORY_BACK = "__history_back__";

export function canPopHistory(
  state: { idx?: unknown } | null | undefined = typeof window === "undefined" ? null : window.history.state,
): boolean {
  const idx = state?.idx;
  return typeof idx === "number" && idx > 0;
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
