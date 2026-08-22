"use client";

import { useCallback, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const returnTrue = () => true;
const returnFalse = () => false;

/**
 * True once the client has hydrated, false on the server and on the first
 * client render. Replaces the useState(false) + useEffect(setMounted) flag,
 * which writes state from an effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, returnTrue, returnFalse);
}

/**
 * Reads a localStorage key as external state, so no effect has to copy it into
 * component state after mount. Re-reads on cross-tab `storage` events and, when
 * given, on a same-tab custom event.
 *
 * `parse` must return a primitive. useSyncExternalStore compares snapshots by
 * identity, so a parse that builds a fresh object or array every call would
 * re-render forever. Parse to a string here and derive the object in the
 * component, or give that key its own cached store.
 */
export function useStoredValue<T extends string | number | boolean | null>(
  key: string,
  parse: (raw: string | null) => T,
  serverValue: T,
  customEventName?: string,
): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      function onStorage(event: StorageEvent) {
        if (event.key === null || event.key === key) onChange();
      }
      window.addEventListener("storage", onStorage);
      if (customEventName) window.addEventListener(customEventName, onChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        if (customEventName) window.removeEventListener(customEventName, onChange);
      };
    },
    [key, customEventName],
  );

  const getSnapshot = useCallback(() => {
    try {
      return parse(window.localStorage.getItem(key));
    } catch {
      return serverValue;
    }
  }, [key, parse, serverValue]);

  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
