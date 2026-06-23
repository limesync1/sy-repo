import { lazy, Suspense } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import TrustBar from "@/components/conversion/TrustBar";
import InlineQuoteTeaser from "@/components/conversion/InlineQuoteTeaser";
import { findMovingCity, MOVING_CITIES } from "./movingCityData";

const Footer = lazy(() => import("@/components/landing/Footer"));

/** By-specifik landingsside for flyttehjælp. Renderes ud fra :city param. */
const MovingCityPage = () => {
  const { city: citySlug } = useParams<{ city: string }>();
  const city = findMovingCity(citySlug);
  if (!city) return <Navigate to="/virksomheder?category=Flyttehj%C3%A6lp" replace />;

  const canonical = `/flyttehjaelp/${city.slug}`;
  const fullUrl = `https://serviceydere.dk${canonical}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Flyttehjælp",
      provider: { "@type": "Organization", name: "Serviceydere", url: "https://serviceydere.dk/" },
      areaServed: { "@type": "City", name: city.name, "@id": fullUrl },
      name: `Flyttehjælp i ${city.name}`,
      description: `Find flyttefirmaer i ${city.name}. Få op til 3 gratis tilbud, sammenlign priser og læs anmeldelser.`,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "DKK",
        lowPrice: String(city.hourlyLow),
        highPrice: String(city.villaMoveHigh),
        offerCount: "30+",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Flyttehjælp", item: "https://serviceydere.dk/virksomheder?category=Flyttehj%C3%A6lp" },
        { "@type": "ListItem", position: 3, name: city.name, item: fullUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: `Hvad koster flyttehjælp i ${city.name}?`, acceptedAnswer: { "@type": "Answer", text: `Flyttehjælp i ${city.name} koster typisk ${city.hourlyLow}–${city.hourlyHigh} kr. i timen for to mænd + bil. En 1–2 værelses lejlighed koster ${city.smallMoveLow}–${city.smallMoveHigh} kr. som fast pris, og en villa ${city.villaMoveLow}–${city.villaMoveHigh} kr.` } },
        { "@type": "Question", name: `Hvornår skal jeg bestille flyttefirma i ${city.name}?`, acceptedAnswer: { "@type": "Answer", text: `Bestil 3–4 uger frem i hverdage. Sommermånederne (juni–august) og overgangsdatoer (1. og 15.) bør bookes 6–8 uger frem.` } },
        { "@type": "Question", name: `Hvad er bedst — timepris eller fast pris?`, acceptedAnswer: { "@type": "Answer", text: `Fast pris giver budgetsikkerhed når omfanget er kendt (typisk lejlighed/villa). Timepris egner sig til mindre flytninger eller når mængden er svær at vurdere.` } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Flyttehjælp i ${city.name} – Sammenlign priser 2026`}
        description={`Find flyttefirmaer i ${city.name}. Timepris fra ${city.hourlyLow} kr. Få op til 3 gratis tilbud fra verificerede flyttefolk i ${city.region}.`}
        canonicalPath={canonical}
        keywords={`flyttehjælp ${city.name}, flyttefirma ${city.name}, flyttemand ${city.name}, ${city.name} flyttehjælp pris, billig flyttehjælp ${city.name}`}
        ogType="website"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Flyttehjælp", to: "/virksomheder?category=Flyttehj%C3%A6lp" },
          { label: city.name },
        ]}
        eyebrow={`Flyttehjælp · ${city.region} · Opdateret 2026`}
        title={`Flyttehjælp i ${city.name}`}
        subtitle={`Find og book verificerede flyttefirmaer i ${city.name} og hele ${city.region}. Få op til 3 gratis tilbud og sammenlign priser, leveringstider og anmeldelser.`}
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="article-content prose prose-neutral dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">{city.name} kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>Timepris (2 mænd + bil): <strong>{city.hourlyLow}–{city.hourlyHigh} kr.</strong> inkl. moms</li>
              <li>Lille lejlighed (1–2 vær.): <strong>{city.smallMoveLow}–{city.smallMoveHigh} kr.</strong></li>
              <li>Villa (4–5 vær.): <strong>{city.villaMoveLow}–{city.villaMoveHigh} kr.</strong></li>
              <li>Dækker postnumre: <strong>{city.postalRange}</strong></li>
            </ul>
          </div>

          <TrustBar />
          <InlineQuoteTeaser
            category="Flyttehjælp"
            heading={`Få 3 gratis tilbud på flyttehjælp i ${city.name}`}
          />

          <h2>Flyttemarkedet i {city.name}</h2>
          <p>{city.intro}</p>
          <p>{city.localFactor}</p>

          <h2>Priser på flyttehjælp i {city.name}</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Pris i {city.name}</th><th className="px-4 py-3 font-semibold">Inkluderet</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">Timepris (2 mænd + bil)</td><td className="px-4 py-3">{city.hourlyLow}–{city.hourlyHigh} kr./time</td><td className="px-4 py-3">Min. 2–3 timer</td></tr>
                <tr><td className="px-4 py-3">Lejlighed 1–2 vær.</td><td className="px-4 py-3">{city.smallMoveLow}–{city.smallMoveHigh} kr.</td><td className="px-4 py-3">Fast pris</td></tr>
                <tr><td className="px-4 py-3">Lejlighed 3 vær.</td><td className="px-4 py-3">{Math.round(city.smallMoveHigh * 1.2)}–{Math.round(city.villaMoveLow * 0.85)} kr.</td><td className="px-4 py-3">Fast pris</td></tr>
                <tr><td className="px-4 py-3">Villa 4–5 vær.</td><td className="px-4 py-3">{city.villaMoveLow}–{city.villaMoveHigh} kr.</td><td className="px-4 py-3">Fast pris</td></tr>
                <tr><td className="px-4 py-3">Nedpakning</td><td className="px-4 py-3">+25–40% af flyttepris</td><td className="px-4 py-3">Inkl. kasser</td></tr>
                <tr><td className="px-4 py-3">Opbevaring (pr. md.)</td><td className="px-4 py-3">800–2.500 kr.</td><td className="px-4 py-3">Pr. m³ varieres</td></tr>
              </tbody>
            </table>
            <p className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              Vejledende priser inkl. moms · Opdateret 2026
            </p>
          </div>

          <h2>Populære flytteruter fra {city.name}</h2>
          <ul>
            {city.popularRoutes.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>

          <h2>Sådan vælger du et flyttefirma i {city.name}</h2>
          <ol>
            <li><strong>Indhent 3 tilbud</strong> — sammenlign fast pris vs. timepris.</li>
            <li><strong>Tjek forsikring</strong> — alle seriøse firmaer har transportforsikring (typisk 500.000–1 mio. kr.).</li>
            <li><strong>Bed om besigtigelse</strong> ved villa/større lejlighed for præcis pris.</li>
            <li><strong>Tjek CVR + anmeldelser</strong> — undgå sort økonomi og firmaer uden referencer.</li>
            <li><strong>Aftal nedpakning skriftligt</strong> — kasser, indpakning og udpakning afregnes ofte særskilt.</li>
          </ol>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Få tilbud fra flyttefirmaer i {city.name}</h2>
            <p className="mt-2 text-foreground/80">
              Beskriv din flytning én gang — modtag op til 3 uforpligtende tilbud fra verificerede
              flyttefirmaer i {city.name}.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to="/virksomheder?category=Flyttehj%C3%A6lp" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se flyttefirmaer i {city.name}</Link>
            </div>
          </div>

          <h2>Andre byer</h2>
          <p className="text-sm">
            Flyttehjælp i andre danske byer:{" "}
            {MOVING_CITIES.filter((c) => c.slug !== city.slug).map((c, i, arr) => (
              <span key={c.slug}>
                <Link to={`/flyttehjaelp/${c.slug}`} className="underline">{c.name}</Link>
                {i < arr.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </article>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default MovingCityPage;