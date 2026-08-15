import { Fragment, ReactNode, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/landing/PageHero";
import ArticleFaqSection from "@/components/content/ArticleFaqSection";
import { productPagesExcept, industryPagesExcept } from "./softwareRegistry";
import { BRAND_DEFINITION, BRAND_FEATURE_LIST } from "@/lib/brand";

const Footer = lazy(() => import("@/components/landing/Footer"));

export interface SoftwareSection {
  heading?: string;
  paragraphs?: ReactNode[];
  list?: ReactNode[];
  body?: ReactNode;
}

export interface SoftwareConfig {
  canonicalPath: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;

  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  breadcrumbLabel: string;

  /** Direkte svar i første afsnit — den form sprogmodeller citerer. */
  answer: string;
  /** Korte, citerbare fakta. */
  facts: string[];

  sections: SoftwareSection[];
  faq: { q: string; a: string }[];

  cta?: { heading: string; body: string };
  updatedAt?: string;
}

/**
 * Fælles skabelon for de offentlige produktsider (/software/*). Giver samme
 * designsprog som resten af platformen (PageHero + standardkort) og leverer
 * automatisk SoftwareApplication-, BreadcrumbList- og FAQPage-schema, så både
 * Google og sprogmodeller kan læse hvad systemet faktisk kan.
 */
export function defineSoftwarePage(cfg: SoftwareConfig) {
  const fullUrl = `https://serviceydere.dk${cfg.canonicalPath}`;
  const isHub = cfg.canonicalPath === "/software";

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Serviceydere",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Field Service Management",
      operatingSystem: "Web, iOS, Android (webapp)",
      url: fullUrl,
      inLanguage: "da-DK",
      // Samme definition overalt — se src/lib/brand.ts for hvorfor.
      description: BRAND_DEFINITION,
      abstract: cfg.answer,
      featureList: BRAND_FEATURE_LIST,
      offers: {
        "@type": "Offer",
        price: "289",
        priceCurrency: "DKK",
        url: "https://serviceydere.dk/software/priser",
        description:
          "289 kr. pr. måned ekskl. moms med ruteplanlægning inkluderet. 14 dages gratis prøve uden betalingskort, derefter valgfri fortsættelse. Ekstra medarbejderlogin 59 kr./md. Ingen binding.",
      },
      provider: {
        "@type": "Organization",
        name: "Serviceydere",
        url: "https://serviceydere.dk/",
      },
      areaServed: { "@type": "Country", name: "Danmark" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Software", item: "https://serviceydere.dk/software" },
        ...(isHub
          ? []
          : [{ "@type": "ListItem", position: 3, name: cfg.breadcrumbLabel, item: fullUrl }]),
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

  const related = productPagesExcept(cfg.canonicalPath);
  const industries = industryPagesExcept(cfg.canonicalPath);

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
      <PageHero
        eyebrow={cfg.heroEyebrow}
        title={cfg.heroTitle}
        subtitle={cfg.heroSubtitle}
        actions={
          <>
            <Link
              to="/opret-virksomhed"
              className="inline-flex h-12 items-center justify-center rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-opacity hover:opacity-90"
            >
              Start 14 dages gratis prøve
            </Link>
            <Link
              to="/kontakt"
              className="inline-flex h-12 items-center justify-center rounded-full border border-background/25 px-6 text-sm font-semibold text-background transition-colors hover:bg-background/10"
            >
              Book en gennemgang
            </Link>
          </>
        }
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <nav aria-label="Brødkrumme" className="mb-8 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Forside</Link>
          <span className="px-2">/</span>
          {isHub ? (
            <span className="text-foreground">Software</span>
          ) : (
            <>
              <Link to="/software" className="hover:text-foreground">Software</Link>
              <span className="px-2">/</span>
              <span className="text-foreground">{cfg.breadcrumbLabel}</span>
            </>
          )}
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          <article className="article-content prose prose-neutral max-w-none dark:prose-invert">
            <p className="lead text-lg leading-8 text-foreground">{cfg.answer}</p>

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
                {s.body}
              </Fragment>
            ))}
          </article>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-panel">
              <p className="text-sm font-semibold tracking-tight text-foreground">Kort fortalt</p>
              <ul className="mt-4 space-y-3">
                {cfg.facts.map((f) => (
                  <li key={f} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-muted/35 p-6">
              <p className="text-sm font-semibold tracking-tight text-foreground">Resten af systemet</p>
              <ul className="mt-4 space-y-2">
                {related.map((r) => (
                  <li key={r.href}>
                    <Link
                      to={r.href}
                      className="group flex items-start gap-2 rounded-lg px-2 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                      <span>
                        <span className="font-medium">{r.label}</span>
                        <span className="block text-xs leading-5 text-muted-foreground">{r.blurb}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {industries.length > 0 && (
              <div className="mt-4 rounded-2xl border border-border bg-muted/35 p-6">
                <p className="text-sm font-semibold tracking-tight text-foreground">Samme system i din branche</p>
                <ul className="mt-4 space-y-2">
                  {industries.map((r) => (
                    <li key={r.href}>
                      <Link
                        to={r.href}
                        className="group flex items-start gap-2 rounded-lg px-2 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                        <span className="font-medium">{r.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-panel sm:p-8">
          <h2 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            {cfg.cta?.heading ?? "Prøv Serviceydere med din egen virksomhed"}
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            {cfg.cta?.body ??
              "Opret virksomheden og kør 14 dage gratis uden betalingskort. Du kan bruge systemet uden at være på markedspladsen — og markedspladsen uden at bruge planlægningen."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/opret-virksomhed"
              className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90"
            >
              Opret virksomhed
            </Link>
            <Link
              to="/kontakt"
              className="inline-flex h-11 items-center rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Kontakt os
            </Link>
          </div>
        </div>

        <div className="article-content prose prose-neutral max-w-none dark:prose-invert">
          <ArticleFaqSection items={cfg.faq} />
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
  Page.displayName = `SoftwarePage(${cfg.canonicalPath})`;
  return Page;
}
