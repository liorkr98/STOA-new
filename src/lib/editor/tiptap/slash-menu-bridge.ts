import type { SlashItem } from "@/components/editor/tiptap/slash-menu";

export interface SlashMenuBridgeState {
  items: SlashItem[];
  command: (item: SlashItem) => void;
  clientRect: (() => DOMRect | null) | null;
  onKeyDown: ((event: KeyboardEvent) => boolean) | null;
}

type Listener = () => void;

let state: SlashMenuBridgeState | null = null;
const listeners = new Set<Listener>();
let exitTimer: ReturnType<typeof setTimeout> | null = null;

/** React-hosted slash menu state — survives editor transactions without unmounting. */
export const slashMenuBridge = {
  getState(): SlashMenuBridgeState | null {
    return state;
  },

  open(next: Omit<SlashMenuBridgeState, "onKeyDown"> & { onKeyDown?: SlashMenuBridgeState["onKeyDown"] }) {
    if (exitTimer) {
      clearTimeout(exitTimer);
      exitTimer = null;
    }
    state = {
      ...next,
      onKeyDown: next.onKeyDown ?? state?.onKeyDown ?? null,
    };
    for (const fn of listeners) fn();
  },

  setKeyHandler(handler: SlashMenuBridgeState["onKeyDown"]) {
    if (state) state = { ...state, onKeyDown: handler };
  },

  handleKeyDown(event: KeyboardEvent): boolean {
    return state?.onKeyDown?.(event) ?? false;
  },

  scheduleClose() {
    if (exitTimer) clearTimeout(exitTimer);
    exitTimer = setTimeout(() => {
      exitTimer = null;
      state = null;
      for (const fn of listeners) fn();
    }, 120);
  },

  close() {
    if (exitTimer) {
      clearTimeout(exitTimer);
      exitTimer = null;
    }
    state = null;
    for (const fn of listeners) fn();
  },

  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
