import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { gatedSiteOn } from "@/lib/flags/gated-site";
import { getVerifiedUserId } from "@/lib/db/auth";
import { getReportPreview } from "@/lib/db/reports";
import { getProfileByHandle } from "@/lib/db/profiles";
import { AuthForm } from "@/components/auth/auth-form";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";
import { sameOriginPath } from "@/lib/pwa/urls";
import { gatedHeadline, gatedTarget, type GatedTarget } from "@/lib/gate/routes";

export const dynamic = "force-dynamic";

type Params = { searchParams: Promise<{ from?: string }> };

/**
 * The signed-out wall's prompt (FEATURE_GATED_SITE). Middleware answers any
 * gated address with this page when there is no verified session, so the
 * reader stays on the address they opened, and the page behind it never runs.
 *
 * It names what is behind the wall and carries a link preview: a title, the
 * analyst's name and an image, never the publication's body. Social cards
 * read those tags; search engines are told not to index (noindex here and on
 * the response header).
 */
async function previewFor(target: GatedTarget): Promise<{ title: string; analyst: string | null; ticker: string | null; image: string | null }> {
  if (target.kind === "report") {
    const p = await getReportPreview(target.id);
    return {
      title: p?.title || "A publication on Stoa",
      analyst: p?.analyst ?? null,
      ticker: p?.ticker ?? null,
      image: `/api/og/report?id=${target.id}`,
    };
  }
  if (target.kind === "analyst") {
    const profile = await getProfileByHandle(target.handle).catch(() => null);
    return {
      title: profile ? `${profile.display_name} (@${profile.handle})` : `@${target.handle} on Stoa`,
      analyst: profile?.display_name ?? null,
      ticker: null,
      image: profile?.cover_url || profile?.avatar_url || null,
    };
  }
  if (target.kind === "ticker") {
    return { title: `${target.ticker} research on Stoa`, analyst: null, ticker: target.ticker, image: `/api/og/stock?ticker=${encodeURIComponent(target.ticker)}` };
  }
  return { title: "Stoa", analyst: null, ticker: null, image: null };
}

async function resolve(searchParams: Params["searchParams"]) {
  const from = sameOriginPath((await searchParams).from, "/home");
  const target = gatedTarget(from);
  return { from, target, preview: await previewFor(target) };
}

export async function generateMetadata({ searchParams }: Params): Promise<Metadata> {
  if (!gatedSiteOn()) return {};
  const { target, preview } = await resolve(searchParams);
  const description = preview.analyst ? `By ${preview.analyst} on Stoa` : "Independent analyst research on Stoa";
  const title = target.kind === "page" ? gatedHeadline(target) : preview.title;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      ...(preview.image ? { images: [{ url: preview.image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: preview.image ? "summary_large_image" : "summary",
      title,
      description,
      ...(preview.image ? { images: [preview.image] } : {}),
    },
  };
}

export default async function SignedOutPage({ searchParams }: Params) {
  // With the wall off this address does not exist, as on main.
  if (!gatedSiteOn()) notFound();
  const [{ from, target, preview }, userId] = await Promise.all([resolve(searchParams), getVerifiedUserId()]);
  if (userId) redirect(from);
  const providers = await getEnabledOAuthProviders();
  const lede =
    target.kind === "report" ? (
      <>
        <span className="font-semibold text-text">{preview.title}</span>
        {preview.analyst ? <> by {preview.analyst}</> : null}. Sign in or create a free account to read it.
      </>
    ) : (
      "Stoa is for members. Sign in or create a free account to continue."
    );

  return (
    <div data-gate={target.kind} className="mx-auto flex min-h-[70vh] max-w-[var(--w-standard)] items-center gutter-x py-16">
      <AuthForm mode="sign-in" providers={providers} next={from} heading={gatedHeadline(target, preview.analyst)} lede={lede} />
    </div>
  );
}
