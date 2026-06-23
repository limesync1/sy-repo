import { lazy, Suspense, ReactNode } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import TrustBar from "@/components/conversion/TrustBar";
import InlineQuoteTeaser from "@/components/conversion/InlineQuoteTeaser";
import ArticleFaqSection from "@/components/content/ArticleFaqSection";
import RelatedContent from "@/components/content/RelatedContent";
import type { BlogPostMeta } from "./blogPosts";

const Footer = lazy(() => import("@/components/landing/Footer"));

interface Props {
  post: BlogPostMeta;
  keywords: string;
  faq?: { q: string; a: string }[];
  children: ReactNode;
}

/** Delt artikel-layout for /blog/:slug sider. Sørger for ensartet SEO,
 *  brødkrummer, JSON-LD (Article + Breadcrumb + evt. FAQPage) og CTA. */
const BlogArticleLayout = ({ post, keywords, faq, children }: Props) => {
  const canonical = `/blog/${post.slug}`;
  const fullUrl = `https://serviceydere.dk${canonical}`;

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: {
        "@type": "Organization",
        name: "Serviceydere",
        url: "https://serviceydere.dk/",
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": fullUrl },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://serviceydere.dk/blog" },
        { "@type": "ListItem", position: 3, name: post.title, item: fullUrl },
      ],
    },
  ];
  if (faq?.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${post.title} | Serviceydere`}
        description={post.description}
        canonicalPath={canonical}
        keywords={keywords}
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Blog", to: "/blog" },
          { label: post.category },
        ]}
        eyebrow={`${post.category} · ${post.readingMinutes} min læsning`}
        title={post.title}
        subtitle={post.description}
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="article-content prose prose-neutral dark:prose-invert">
          <TrustBar />

          {children}

          {faq?.length ? <ArticleFaqSection items={faq} /> : null}

          <InlineQuoteTeaser
            category={post.category === "Økonomi" ? undefined : post.category}
            heading={`Få 3 gratis tilbud${post.category && post.category !== "Økonomi" ? ` på ${post.category.toLowerCase()}` : ""}`}
          />

          <RelatedContent category={post.category} currentPath={canonical} />

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Klar til at få tilbud?</h2>
            <p className="mt-2 text-foreground/80">
              Beskriv opgaven én gang og modtag op til 3 uforpligtende tilbud fra verificerede serviceudbydere.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">
                Få 3 gratis tilbud
              </Link>
              <Link to="/virksomheder" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">
                Se serviceudbydere
              </Link>
            </div>
          </div>
        </article>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default BlogArticleLayout;