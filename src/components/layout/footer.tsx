import Link from "next/link";
import { StoaLogo } from "@/components/brand/logo";

const groups = [
  {
    title: "Product",
    links: [
      { href: "/discover", label: "Discover" },
      { href: "/markets", label: "Markets" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/become-analyst", label: "For analysts" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/scoring", label: "Scoring methodology" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <StoaLogo />
          <p className="t-meta max-w-xs">
            A marketplace for independent stock research, with a verified public track record on
            every call. Think clearly. Invest better.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-3">
            <span className="t-eyebrow">{g.title}</span>
            <ul className="flex flex-col gap-2">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-text-mute hover:text-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1200px] px-5 pb-10">
        <p className="t-meta">
          Stoa is a research marketplace, not a broker or investment adviser. Nothing here is
          financial advice. Past performance does not guarantee future results.
        </p>
      </div>
    </footer>
  );
}
