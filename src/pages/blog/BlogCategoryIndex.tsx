import { lazy, Suspense } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import { BLOG_POSTS } from "./blogPosts";
import { BLOG_CATEGORIES, categoryNameBySlug } from "./blogCategories";

const Footer = lazy(() => import("@/components/landing/Footer"));

/**
 * /blog/kategori/:slug — kategori-baseret blog-index. Giver hver
 * artikel et ekstra statisk indgående link fra en topic-cluster-side,
 * og giver Google et naturligt grupperingssignal pr. emne.
 */
const BlogCategoryIndex = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const name = categoryNameBySlug(slug);
  if (!name) return <Navigate to="/blog" replace />;

  const posts = BLOG_POSTS.filter((p) => p.category === name);
  const canonical = `/blog/kategori/${slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${name} — artikler`,
      url: `https://serviceydere.dk${canonical}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://serviceydere.dk/blog" },
        { "@type": "ListItem", position: 3, name, item: `https://serviceydere.dk${canonical}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
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
        title={`${name} — artikler & guides | Serviceydere`}
        description={`Alle artikler i kategorien ${name}: priser, valg af firma, sammenligning og praktiske guides for 2026.`}
        canonicalPath={canonical}
        keywords={`${name.toLowerCase()} blog, ${name.toLowerCase()} guides, ${name.toLowerCase()} priser`}
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Blog", to: "/blog" },
          { label: name },
        ]}
        eyebrow={`Kategori · ${posts.length} artikler`}
        title={`${name} — artikler & guides`}
        subtitle={`Praktiske guides, priser og firmavalg inden for ${name.toLowerCase()}.`}
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <nav aria-label="Alle kategorier" className="mb-8 flex flex-wrap gap-2">
          <Link to="/blog" className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground hover:bg-muted">
            Alle
          </Link>
          {BLOG_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/blog/kategori/${c.slug}`}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                c.slug === slug
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.slug}
              to={`/blog/${p.slug}`}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-sm"
            >
              <span className="mb-2 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {p.category} · {p.readingMinutes} min
              </span>
              <h2 className="text-lg font-semibold text-foreground group-hover:underline">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            </Link>
          ))}
        </div>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default BlogCategoryIndex;