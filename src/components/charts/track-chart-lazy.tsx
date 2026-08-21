"use client";

import dynamic from "next/dynamic";
import type { TrackPoint } from "@/components/charts/track-chart";

/* Recharts (plus its d3 dependency tree) was ~100kB of the analyst pages'
 * First Load JS for one decorative area chart. ssr:false keeps it out of the
 * critical path; the placeholder holds the chart's exact height so nothing
 * shifts when it streams in. */
const TrackChart = dynamic(
  () => import("@/components/charts/track-chart").then((m) => m.TrackChart),
  {
    ssr: false,
    loading: () => <div className="h-56 w-full" aria-hidden />,
  },
);

export function TrackChartLazy({ data }: { data: TrackPoint[] }) {
  return <TrackChart data={data} />;
}
