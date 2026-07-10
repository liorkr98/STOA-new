import { JsonLd } from "@/components/seo/JsonLd";
import { verdictOf, type Verdict } from "@/lib/fact-check/verdict";
import { absoluteUrl } from "@/lib/seo/site";
import type { FactCheckResult } from "@/lib/ai/fact-check";
import type { Report } from "@/lib/types";

/**
 * Structured data for a report: Article (always) + ClaimReview (when the
 * report has at least one fact-checked claim). Deliberately not
 * FinancialProduct -- schema.org defines that type as a regulated offering
 * sold by a financial institution, which would misrepresent Stoa's
 * publisher-not-adviser positioning in machine-readable form.
 */

// Google's ClaimReview rich result only supports one claim per page; this
// picks the report's headline claim -- verified/disputed first (an actual
// checked claim is more representative of the report than an aside), else
// the first claim of any kind.
function pickPrimaryClaim(claims: FactCheckResult["claims"] | undefined) {
  if (!claims || claims.length === 0) return null;
  const checked = claims.find((c) => {
    const v = verdictOf(c);
    return v === "fact" || v === "contradicted";
  });
  return checked ?? claims[0];
}

const RATING_BY_VERDICT: Record<Verdict, number> = {
  fact: 5,
  unproven: 3,
  opinion: 3,
  contradicted: 1,
};

const ALT_NAME_BY_VERDICT: Record<Verdict, string> = {
  fact: "Fact",
  unproven: "Unproven",
  opinion: "Opinion",
  contradicted: "Contradicted",
};

export function ReportSchema({ report }: { report: Report }) {
  const author = report.author;
  if (!author || !report.published_at) return null;

  const url = absoluteUrl(`/report/${report.id}`);
  const headline = report.title?.trim() || report.summary?.trim() || "Untitled research";

  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    url,
    mainEntityOfPage: url,
    author: {
      "@type": "Person",
      name: author.display_name,
      url: absoluteUrl(`/analyst/${author.handle}`),
    },
    datePublished: report.published_at,
    ...(report.ticker
      ? { about: { "@type": "Corporation", name: report.ticker, tickerSymbol: report.ticker } }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "Stoa",
      url: absoluteUrl("/"),
    },
    // Never fabricated: content_hash is only set once publish-report.ts
    // successfully computes it (src/lib/reports/publish-report.ts). A report
    // published before that column existed, or where hashing failed, simply
    // has no identifier rather than a placeholder digest.
    ...(report.content_hash ? { identifier: `sha256:${report.content_hash}` } : {}),
  };

  // The claim text is lifted straight from the report body. For a paid or
  // subscriber-gated report that body is exactly what the paywall protects --
  // publishing it in public, unauthenticated JSON-LD would leak the gated
  // insight through view-source regardless of who can load the page itself.
  const factCheck =
    report.access === "free"
      ? (report.fact_check_results as unknown as FactCheckResult | null)
      : null;
  const primaryClaim = pickPrimaryClaim(factCheck?.claims);
  const verdict = primaryClaim ? verdictOf(primaryClaim) : null;

  const claimReview: Record<string, unknown> | null =
    primaryClaim && verdict
      ? {
          "@context": "https://schema.org",
          "@type": "ClaimReview",
          url,
          claimReviewed: primaryClaim.text,
          itemReviewed: {
            "@type": "Claim",
            author: { "@type": "Person", name: author.display_name },
            datePublished: report.published_at,
          },
          author: {
            "@type": "Organization",
            name: "Stoa",
            url: absoluteUrl("/"),
          },
          reviewRating: {
            "@type": "Rating",
            ratingValue: RATING_BY_VERDICT[verdict],
            bestRating: 5,
            worstRating: 1,
            alternateName: ALT_NAME_BY_VERDICT[verdict],
          },
        }
      : null;

  return (
    <>
      <JsonLd data={article} />
      {claimReview && <JsonLd data={claimReview} />}
    </>
  );
}
