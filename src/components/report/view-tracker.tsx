"use client";

import { useEffect, useRef } from "react";
import { recordView } from "@/app/actions/reports";

export function ViewTracker({ reportId }: { reportId: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    recordView(reportId);
  }, [reportId]);
  return null;
}
