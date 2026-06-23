import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import { CITIES } from "./cities/cleaningCityData";
import { MOVING_CITIES } from "./cities/movingCityData";
import { HANDYMAN_CITIES } from "./cities/handymanCityData";
import { GARDEN_CITIES } from "./cities/gardenCityData";
import { BLOG_POSTS } from "./blog/blogPosts";
import { GUIDES } from "./guides/guidesRegistry";

const Footer = lazy(() => import("@/components/landing/Footer"));

const GuidesIndex = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Guides og prisoversigter | Serviceydere",
      description:
        "Find prisguides, how-to artikler og by-specifikke oversigter over rengøring og serviceydelser i Danmark.",
      url: "https://serviceydere.dk/guides",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://serviceydere.dk/guides" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: [
        ...GUIDES.map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://serviceydere.dk${g.href}`,
          name: g.title,
        })),
        ...CITIES.map((c, i) => ({
          "@type": "ListItem",
          position: GUIDES.length + i + 1,
          url: `https://serviceydere.dk/rengoering/${c.slug}`,
          name: `Rengøring i ${c.name}`,
        })),
        ...MOVING_CITIES.map((c, i) => ({
          "@type": "ListItem",
          position: GUIDES.length + CITIES.length + i + 1,
          url: `https://serviceydere.dk/flyttehjaelp/${c.slug}`,
          name: `Flyttehjælp i ${c.name}`,
        })),
        ...HANDYMAN_CITIES.map((c, i) => ({
          "@type": "ListItem",
          position: GUIDES.length + CITIES.length + MOVING_CITIES.length + i + 1,
          url: `https://serviceydere.dk/haandvaerker/${c.slug}`,
          name: `Håndværker i ${c.name}`,
        })),
        ...GARDEN_CITIES.map((c, i) => ({
          "@type": "ListItem",
          position: GUIDES.length + CITIES.length + MOVING_CITIES.length + HANDYMAN_CITIES.length + i + 1,
          url: `https://serviceydere.dk/haveservice/${c.slug}`,
          name: `Haveservice i ${c.name}`,
        })),
        ...BLOG_POSTS.map((p, i) => ({
          "@type": "ListItem",
          position: GUIDES.length + CITIES.length + MOVING_CITIES.length + HANDYMAN_CITIES.length + GARDEN_CITIES.length + i + 1,
          url: `https://serviceydere.dk/blog/${p.slug}`,
          name: p.title,
        })),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Guides & prisoversigter | Serviceydere"
        description="Prisguides, how-to artikler og lokale oversigter for rengøring, flyttehjælp og andre serviceydelser i Danmark."
        canonicalPath="/guides"
        keywords="rengøring priser, flyttehjælp priser, prisguide serviceydere, rengøring guide, danmark"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Guides" },
        ]}
        eyebrow="Vidensbase"
        title={<>Guides &amp; prisoversigter</>}
        subtitle="Få overblik over priser, processer og lokale forhold — så du ved hvad du skal kigge efter, før du beder om tilbud."
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section aria-labelledby="guides-heading" className="mb-14">
          <h2 id="guides-heading" className="mb-4 text-2xl font-semibold text-foreground">
            Prisguides &amp; how-to
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => (
              <Link
                key={g.href}
                to={g.href}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-sm"
              >
                <span className="mb-2 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {g.tag}
                </span>
                <h3 className="text-lg font-semibold text-foreground group-hover:underline">
                  {g.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{g.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="cities-heading">
          <h2 id="cities-heading" className="mb-4 text-2xl font-semibold text-foreground">
            Rengøring efter by
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Lokale priser, områder og firmaer i de største danske byer.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CITIES.map((c) => (
              <Link
                key={c.slug}
                to={`/rengoering/${c.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-sm"
              >
                <span className="mb-2 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {c.region}
                </span>
                <h3 className="text-lg font-semibold text-foreground group-hover:underline">
                  Rengøring i {c.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fra {c.hourlyLow} kr./time · {c.postalRange}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="moving-heading" className="mt-14">
          <h2 id="moving-heading" className="mb-4 text-2xl font-semibold text-foreground">
            Flyttehjælp efter by
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Priser, ruter og lokale flyttefirmaer i de største danske byer.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOVING_CITIES.map((c) => (
              <Link
                key={c.slug}
                to={`/flyttehjaelp/${c.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-sm"
              >
                <span className="mb-2 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {c.region}
                </span>
                <h3 className="text-lg font-semibold text-foreground group-hover:underline">
                  Flyttehjælp i {c.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fra {c.hourlyLow} kr./time · {c.postalRange}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="handyman-heading" className="mt-14">
          <h2 id="handyman-heading" className="mb-4 text-2xl font-semibold text-foreground">
            Håndværker efter by
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Lokale timepriser og håndværkere i de største danske byer.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HANDYMAN_CITIES.map((c) => (
              <Link
                key={c.slug}
                to={`/haandvaerker/${c.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-sm"
              >
                <span className="mb-2 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {c.region}
                </span>
                <h3 className="text-lg font-semibold text-foreground group-hover:underline">
                  Håndværker i {c.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fra {c.hourlyLow} kr./time · {c.postalRange}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="garden-heading" className="mt-14">
          <h2 id="garden-heading" className="mb-4 text-2xl font-semibold text-foreground">
            Haveservice efter by
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Lokale priser på græsslåning, hækklipning og fast havepasning.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GARDEN_CITIES.map((c) => (
              <Link
                key={c.slug}
                to={`/haveservice/${c.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-sm"
              >
                <span className="mb-2 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {c.region}
                </span>
                <h3 className="text-lg font-semibold text-foreground group-hover:underline">
                  Haveservice i {c.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fra {c.hourlyLow} kr./time · {c.postalRange}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="blog-heading" className="mt-14">
          <h2 id="blog-heading" className="mb-4 text-2xl font-semibold text-foreground">
            Fra bloggen
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Dybdegående guides og praktiske råd.
          </p>
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
                <h3 className="text-lg font-semibold text-foreground group-hover:underline">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default GuidesIndex;