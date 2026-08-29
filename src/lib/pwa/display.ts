/** Client-only. True when the page is running as an installed home-screen app. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const webkit = /WebKit/i.test(ua);
  const notOther = !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
  return ios && webkit && notOther;
}
