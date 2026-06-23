import { Fragment, ReactNode, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import TrustBar from "@/components/conversion/TrustBar";
import InlineQuoteTeaser from "@/components/conversion/InlineQuoteTeaser";

const Footer = lazy(() => import("@/components/landing/Footer"));

export interface GuideSection {
  heading?: string;
  paragraphs?: ReactNode[];
  list?: ReactNode[];
  ordered?: ReactNode[];
  body?: ReactNode;
}

export interface GuidePriceRow {
  label: string;
  price: string;
  note?: string;
}

export interface GuideConfig {
  /** Canonical sti, fx "/priser/tomrer". */
  canonicalPath: string;
  /** SEO meta. */
  metaTitle: string;
  metaDescription: string;
  keywords: string;

  /** Hero. */
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;

  /** Brødkrumme-label (tredje niveau, fx "Tømrer"). */
  breadcrumbLabel: string;

  /** "Kort fortalt" punkter øverst. */
  quickFacts: ReactNode[];

  /** Pris-tabel. */
  priceTable: {
    rows: GuidePriceRow[];
    footnote?: ReactNode;
    headers?: { label?: string; price?: string; note?: string };
  };

  /** Brødtekst-sektioner mellem pris-tabel og FAQ. */
  sections: GuideSection[];

  /** FAQ — renderes som h3+p OG som FAQPage JSON-LD. */
  faq: { q: string; a: string }[];

  /** CTA-blok nederst. */
  cta: {
    heading: string;
    body: string;
    secondaryLabel: string;
    secondaryHref: string;
  };

  /** Kategori der prefilles i tilbudsflowet (skal matche canonical industry). */
  ctaCategory?: string;

  /** Datoer til Article schema. */
  publishedAt?: string;
  updatedAt?: string;
}

/**
 * CMS-lignende factory til pris-/proces-guides. Et nyt opslag oprettes
 * med ren data og får automatisk:
 *   - <ArticleHero> 1:1 med forsidens hero
 *   - SEO meta + canonical + keywords
 *   - Article + BreadcrumbList + FAQPage JSON-LD
 *   - TrustBar + InlineQuoteTeaser med korrekt ctaCategory
 *   - Konsistent CTA-bånd og footer
 */
export function defineGuidePage(cfg: GuideConfig) {
  const fullUrl = `https://serviceydere.dk${cfg.canonicalPath}`;
  const published = cfg.publishedAt || "2026-06-15";
  const modified = cfg.updatedAt || published;

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: cfg.heroTitle,
      description: cfg.metaDescription,
      datePublished: published,
      dateModified: modified,
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: {
        "@type": "Organization",
        name: "Serviceydere",
        logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" },
      },
      mainEntityOfPage: fullUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Prisguides", item: "https://serviceydere.dk/guides" },
        { "@type": "ListItem", position: 3, name: cfg.breadcrumbLabel, item: fullUrl },
      ],
    },
  ];
  if (cfg.faq.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: cfg.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  const Page = () => (
    <div className="min-h-screen bg-background">
      <SEO
        title={cfg.metaTitle}
        description={cfg.metaDescription}
        canonicalPath={cfg.canonicalPath}
        keywords={cfg.keywords}
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Prisguides", to: "/guides" },
          { label: cfg.breadcrumbLabel },
        ]}
        eyebrow={cfg.heroEyebrow}
        title={cfg.heroTitle}
        subtitle={cfg.heroSubtitle}
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="prose prose-neutral max-w-3xl dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              {cfg.quickFacts.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          </div>

          <TrustBar />
          <InlineQuoteTeaser
            category={cfg.ctaCategory}
            heading={`Få 3 gratis tilbud${cfg.ctaCategory ? ` på ${cfg.ctaCategory.toLowerCase()}` : ""}`}
          />

          <div className="not-prose my-8 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">{cfg.priceTable.headers?.label ?? "Opgave"}</th>
                  <th className="px-4 py-3 font-semibold">{cfg.priceTable.headers?.price ?? "Typisk pris"}</th>
                  <th className="px-4 py-3 font-semibold">{cfg.priceTable.headers?.note ?? "Note"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cfg.priceTable.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{r.label}</td>
                    <td className="px-4 py-3">{r.price}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cfg.priceTable.footnote && (
              <p className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">{cfg.priceTable.footnote}</p>
            )}
          </div>

          {cfg.sections.map((s, i) => (
            <Fragment key={i}>
              {s.heading && <h2>{s.heading}</h2>}
              {s.paragraphs?.map((p, j) => (
                <p key={`p-${j}`}>{p}</p>
              ))}
              {s.list && (
                <ul>
                  {s.list.map((li, j) => (
                    <li key={`li-${j}`}>{li}</li>
                  ))}
                </ul>
              )}
              {s.ordered && (
                <ol>
                  {s.ordered.map((li, j) => (
                    <li key={`oi-${j}`}>{li}</li>
                  ))}
                </ol>
              )}
              {s.body}
            </Fragment>
          ))}

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">{cfg.cta.heading}</h2>
            <p className="mt-2 text-foreground/80">{cfg.cta.body}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={cfg.ctaCategory ? `/tilbud?category=${encodeURIComponent(cfg.ctaCategory)}` : "/tilbud"}
                className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90"
              >
                Få 3 gratis tilbud
              </Link>
              <Link
                to={cfg.cta.secondaryHref}
                className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                {cfg.cta.secondaryLabel}
              </Link>
            </div>
          </div>

          <h2>Ofte stillede spørgsmål</h2>
          {cfg.faq.map((f, i) => (
            <Fragment key={i}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </Fragment>
          ))}
        </article>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
  Page.displayName = `GuidePage(${cfg.canonicalPath})`;
  return Page;
}