"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/design/cn";
import type { TodayFace } from "@/lib/today/types";

/**
 * The people posting: circular faces with the name and beat beneath. A
 * coral ring marks someone who has posted since the reader last looked.
 *
 * "Last looked" is this browser's own memory of the previous visit to
 * Today, a per-device convenience: the stored moment is read once, then
 * replaced with now, so the rings describe what is new since the visit
 * before this one. A first visit has nothing to compare with and rings
 * nobody. The rings are drawn after mount, never on the server.
 *
 * On a phone this is the page's one sideways scroller; on a desktop the
 * faces wrap instead, so nothing on a wide screen scrolls sideways.
 */

const KEY = "stoa:today:last-looked";

// One reading per page load, kept against the load it belongs to: an effect
// that runs twice (React's development check) must not read back the stamp
// it just wrote and ring nobody.
let reading: { at: number; value: number | null } | null = null;

function readAndStamp(): number | null {
  const loadedAt = performance.timeOrigin;
  if (reading?.at === loadedAt) return reading.value;
  reading = { at: loadedAt, value: stamp() };
  return reading.value;
}

function stamp(): number | null {
  try {
    const prev = Number(window.localStorage.getItem(KEY));
    window.localStorage.setItem(KEY, String(Date.now()));
    return Number.isFinite(prev) && prev > 0 ? prev : null;
  } catch {
    return null;
  }
}

export function TodayFaces({ people, today, className }: { people: TodayFace[]; today: boolean; className?: string }) {
  const [lastLooked, setLastLooked] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after mount
    setLastLooked(readAndStamp());
  }, []);

  if (people.length === 0) return null;
  const title = today ? "Posting today" : "Recently posted";
  return (
    <section aria-label={title} className={className}>
      <h2 className="t-headline text-text">{title}</h2>
      <ul className="scroll-bare -mx-5 mt-5 flex snap-x scroll-px-5 gap-4 overflow-x-auto px-5 pb-1 pt-1.5 md:mx-0 md:flex-wrap md:gap-x-5 md:gap-y-6 md:overflow-visible md:px-0">
        {people.map((p) => {
          const fresh = lastLooked != null && Date.parse(p.lastPublishedAt) > lastLooked;
          return (
            <li key={p.id} className="w-[84px] shrink-0 snap-start">
              <Link
                href={`/analyst/${p.handle}`}
                className="focus-ring group flex flex-col items-center rounded-inner text-center"
                aria-label={fresh ? `${p.displayName}, posted since you last looked` : p.displayName}
              >
                <span className={cn("rounded-avatar", fresh && "today-ring")}>
                  <Avatar src={p.avatarUrl} name={p.displayName} size={72} />
                </span>
                <span className="mt-2 w-full truncate text-ticker font-semibold text-text group-hover:underline">
                  {p.displayName.split(/\s+/)[0]}
                </span>
                {p.specialty ? <span className="w-full truncate text-ticker text-text-mute">{p.specialty}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
