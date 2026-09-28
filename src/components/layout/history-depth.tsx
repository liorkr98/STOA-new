"use client";

import { useEffect } from "react";
import { installHistoryDepth } from "@/lib/nav/back";

/** Stamps each history entry with its depth in the app, so Back knows whether a page is behind it. */
export function HistoryDepth() {
  useEffect(() => {
    installHistoryDepth();
  }, []);
  return null;
}
