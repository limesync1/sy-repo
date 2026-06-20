import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import { BLOG_POSTS } from "./blogPosts";

const Footer = lazy(() => import("@/components/landing/Footer"));

const BlogIndex = () => {
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

      <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <nav aria-label="Brødkrummer" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Forside</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Blog</span>
        </nav>

        <header className="mb-10">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Vidensbase
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Blog &amp; artikler
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Dybdegående guides og praktiske råd til alt fra at vælge rengøringsfirma til at planlægge en flytning.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((p) => (
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

export default BlogIndex;