"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Compact center-nav search. Submits to /search so results reuse the
 * existing search page rather than inventing a second results surface.
 */
export function NavSearch() {
  const router = useRouter();

  return (
    <form
      className="relative w-full max-w-[320px]"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = String(fd.get("q") ?? "").trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
    >
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
        aria-hidden
      />
      <input
        name="q"
        type="search"
        placeholder="Search tickers or analysts"
        aria-label="Search tickers or analysts"
        className="w-full rounded-[var(--radius-btn)] border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus-ring"
      />
    </form>
  );
}
