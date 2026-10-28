/**
 * The YouTube page's own objects (ytcfg, the player) live in the page's
 * world, which the card's script cannot see. A small script runs there and
 * answers questions over two DOM events. Details cross as JSON strings: an
 * object in a CustomEvent's detail does not survive the hop between worlds.
 */
export const PAGE_REQUEST = "stoa:page-request";
export const PAGE_RESPONSE = "stoa:page-response";

export type VideoDetails = {
  videoId: string;
  title: string | null;
  channel: string | null;
  channelId: string | null;
  isLive: boolean;
  duration: number | null;
};

export type DirectSegment = { start: number; end: number; text: string };

export type PageQuestion =
  | { id: string; kind: "video"; videoId: string }
  | { id: string; kind: "transcript"; videoId: string };

export type PageAnswer = { id: string; ok: boolean; data: unknown };

let counter = 0;

/** Asks the page-world script; null if it does not answer in time. */
export function askPage<T>(question: Omit<PageQuestion, "id">, timeoutMs = 10_000): Promise<T | null> {
  const id = `q${Date.now()}-${counter++}`;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      document.removeEventListener(PAGE_RESPONSE, onAnswer);
      resolve(null);
    }, timeoutMs);
    function onAnswer(e: Event) {
      let answer: PageAnswer;
      try {
        answer = JSON.parse(String((e as CustomEvent).detail)) as PageAnswer;
      } catch {
        return;
      }
      if (answer.id !== id) return;
      clearTimeout(timer);
      document.removeEventListener(PAGE_RESPONSE, onAnswer);
      resolve(answer.ok ? (answer.data as T) : null);
    }
    document.addEventListener(PAGE_RESPONSE, onAnswer);
    document.dispatchEvent(new CustomEvent(PAGE_REQUEST, { detail: JSON.stringify({ ...question, id }) }));
  });
}
