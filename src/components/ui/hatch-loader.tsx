"use client";

import { useEffect, useState } from "react";

/**
 * Hatch spinner (ldrs web component). ldrs defines a class that extends
 * HTMLElement at module load, so it must be imported on the client only --
 * a top-level import would crash SSR. We register it in an effect and render
 * nothing until the custom element is defined, avoiding an un-upgraded flash.
 * Color defaults to the ink token to stay inside the six-token palette.
 */
export function HatchLoader({
  size = 28,
  stroke = 4,
  speed = 3.5,
  color = "var(--ink)",
  className,
  label = "Loading",
}: {
  size?: number | string;
  stroke?: number | string;
  speed?: number | string;
  color?: string;
  className?: string;
  label?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void import("ldrs").then(({ hatch }) => {
      hatch.register();
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <span role="status" aria-live="polite" className={className}>
      {ready && <l-hatch size={size} stroke={stroke} speed={speed} color={color} />}
      <span className="sr-only">{label}</span>
    </span>
  );
}
