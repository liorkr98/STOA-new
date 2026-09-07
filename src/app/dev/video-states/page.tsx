"use client";

import { useState } from "react";
import { ClipPendingPlayer, ClipPendingThumb } from "@/components/video/clip-pending";

/**
 * Dev-only: the frames a publication shows while its clip is on the way, at
 * the widths they ship in. The report page's column is 380px on desktop and
 * full width on a phone; the Today frames are 118x76 and 84x54.
 */
export default function DevVideoStatesPage() {
  const [startedAt] = useState(() => new Date(Date.now() - 3 * 60_000).toISOString());
  return (
    <div className="mx-auto w-full max-w-[var(--w-standard)] px-5 py-10">
      <p className="t-eyebrow">Video states</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">A clip on the way</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[380px_380px]">
        <section>
          <h2 className="num mb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">Report page · processing</h2>
          <ClipPendingPlayer status="processing" startedAt={startedAt} analystName="Lena Kowalczyk" isAuthor={false} />
        </section>
        <section>
          <h2 className="num mb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">Report page · failed, seen by the creator</h2>
          <ClipPendingPlayer status="failed" startedAt={startedAt} analystName="Lena Kowalczyk" isAuthor />
        </section>
      </div>
      <section className="mt-12">
        <h2 className="num mb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">Today and profile frames</h2>
        <div className="flex flex-wrap items-end gap-6">
          <span className="today-thumb">
            <ClipPendingThumb />
          </span>
          <span className="today-thumb today-thumb--sm">
            <ClipPendingThumb label={false} />
          </span>
          <span className="relative block aspect-video w-[280px] overflow-hidden rounded-[10px]">
            <ClipPendingThumb />
          </span>
        </div>
      </section>
    </div>
  );
}
