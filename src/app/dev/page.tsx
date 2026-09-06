import Link from "next/link";

/**
 * Index of the fixture routes. Every entry renders a surface with fictional
 * data so populated states can be reviewed without a seeded database.
 */
const ROUTES: { href: string; label: string; note: string }[] = [
  { href: "/dev/landing", label: "Landing", note: "The signed-out root with fixture headlines, verdicts and a wall of faces (tape is live)." },
  { href: "/dev/today", label: "Today", note: "The /home newspaper, signed-in state with a desk and memberships." },
  { href: "/dev/today?state=empty", label: "Today · signed out", note: "No desk, no memberships; suggestions fill the lists." },
  { href: "/dev/explore", label: "Explore", note: "The 30-tile wall; click a tile for the Feed player overlay." },
  { href: "/dev/explore?ticker=NVDA", label: "Explore · ticker filter", note: "The EVERY TAKE ON THIS NAME state." },
  { href: "/dev/explore?sector=Semiconductors", label: "Explore · sector filter", note: "Filtered by sector." },
  { href: "/dev/feed", label: "Feed", note: "The player as a page: a call beside a callless note, sealed cards, the Steelman, discussion." },
  { href: "/dev/profile", label: "Profile", note: "An established analyst: lead, Most Watched, Everything, subject filter." },
  { href: "/dev/profile?state=new", label: "Profile · new analyst", note: "Two publications, deliberately sparse." },
  { href: "/dev/compose", label: "Compose", note: "The video rung with sample overlays, tags, the processing state, the Publications row." },
  { href: "/dev/compose-refresh", label: "Compose · refresh and crash", note: "The workspace mounted from an async server page under a loading boundary, with buttons that replay a save's router refresh and crash the current step, to prove neither loses the creator's place." },
  { href: "/dev/markets", label: "Markets", note: "Markets bands with fixture coverage." },
  { href: "/dev/dispatch", label: "Dispatch", note: "The public dispatch page with fixture stories." },
  { href: "/dev/editor", label: "Editor", note: "The Tiptap report editor with sample blocks." },
  { href: "/dev/components", label: "Components", note: "Shared primitives: chips, seals, buttons, cards." },
  { href: "/dev/marks", label: "Marks", note: "Wordmark and brand marks." },
  { href: "/dev/chart-read", label: "Chart read", note: "The calls chart against sample candles." },
];

export default function DevIndexPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <p className="t-eyebrow">Fixture routes</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Every surface, with fictional data</h1>
      <p className="mt-2 text-sm text-text-mute">
        Fictional analysts, invented headlines, no portraits, no real videos. Nothing here reads or writes real user data.
        On the live site, open any of these once with <span className="num">?dev=1</span> and they stay open on this browser for 30 days.
      </p>
      <ul className="mt-8 flex flex-col divide-y divide-[var(--border)]">
        {ROUTES.map((r) => (
          <li key={r.href} className="py-3">
            <Link href={r.href} className="focus-ring rounded font-display text-lg font-semibold tracking-tight hover:underline">
              {r.label}
            </Link>
            <span className="num ml-3 text-[11px] text-text-faint">{r.href}</span>
            <p className="mt-0.5 text-sm text-text-mute">{r.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
