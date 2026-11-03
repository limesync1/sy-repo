import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import { BLOG_POSTS } from "./blogPosts";
import { BLOG_CATEGORIES } from "./blogCategories";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";

import BlogPostCard from "@/components/content/BlogPostCard";
import { useArticleImages } from "@/lib/article-images";

const Footer = lazy(() => import("@/components/landing/Footer"));

const BlogIndex = () => {
  const { data: images } = useArticleImages();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Serviceydere Blog",
      url: "https://serviceydere.dk/blog",
      description: "Artikler om rengøring, flytning, håndværk og hverdagsservice i Danmark.",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: BLOG_POSTS.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://serviceydere.dk/blog/${p.slug}`,
        name: p.title,
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Blog — Råd og guides om service i hjemmet | Serviceydere"
        description="Læs artikler om rengøring, flytning, håndværk og hverdagsservice. Praktiske guides, tjeklister og økonomiske tips."
        canonicalPath="/blog"
        keywords="rengøring blog, flytning guide, håndværker råd, serviceydere blog, hjemmeservice danmark"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[{ label: "Forside", to: "/" }, { label: "Blog" }]}
        eyebrow="Vidensbase"
        title="Blog & artikler"
        subtitle="Dybdegående guides og praktiske råd til alt fra at vælge rengøringsfirma til at planlægge en flytning."
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-10">
          <LocalQuoteWidget
            heading="Brug for hjælp nu? Få 3 lokale tilbud"
            description="Vælg service og by — vi finder verificerede firmaer der svarer inden for 24 timer."
          />
        </div>

        <nav aria-label="Bladr efter kategori" className="mb-8 flex flex-wrap gap-2">
          <span className="inline-flex min-h-11 items-center rounded-full border border-foreground bg-foreground px-4 text-sm text-background">Alle</span>
          {BLOG_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/blog/kategori/${c.slug}`}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 text-sm text-foreground transition hover:bg-muted"
            >
              {c.name} <span className="text-muted-foreground">({c.count})</span>
            </Link>
          ))}
        </nav>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((p) => (
            <BlogPostCard key={p.slug} slug={p.slug} title={p.title} description={p.description} category={p.category} readingMinutes={p.readingMinutes} image={images?.get(`/blog/${p.slug}`)} />
          ))}
        </div>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default BlogIndex;