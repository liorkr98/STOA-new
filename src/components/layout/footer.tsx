import Link from "next/link";
import { StoaLogo } from "@/components/brand/logo";

const groups = [
  {
    title: "Product",
    links: [
      { href: "/feed", label: "Feed" },
      { href: "/markets", label: "Markets" },
      { href: "/become-analyst", label: "For analysts" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/scoring", label: "How calls are graded" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/terms/creators", label: "Creator terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/cookies", label: "Cookies" },
      { href: "/subprocessors", label: "Subprocessors" },
      { href: "/not-advice", label: "Not advice" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/compliance-brief", label: "Compliance brief" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-[var(--page-gutter)]">
      <div className="mx-auto grid w-full max-w-[var(--w-wide)] gap-10 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)]">
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
      <div className="mx-auto flex w-full max-w-[var(--w-wide)] flex-col gap-2 pb-10">
        <p className="t-meta">
          Stoa publishes research and education, not investment advice. Stoa is not a broker or
          investment adviser. Past performance does not guarantee future results.
        </p>
        <p className="t-meta text-[11px]">
          Charts by{" "}
          <a
            href="https://www.tradingview.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            TradingView
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
