"use client";

import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-surface py-2.5 pl-10 pr-4 text-sm focus-ring";

export function SearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();

  return (
    <form
      className="relative max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = String(fd.get("q") ?? "").trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
    >
      <MagnifyingGlass
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
      />
      <input
        name="q"
        defaultValue={initialQuery}
        placeholder="Search analysts, tickers, research..."
        className={cn(inputClass)}
      />
    </form>
  );
}
