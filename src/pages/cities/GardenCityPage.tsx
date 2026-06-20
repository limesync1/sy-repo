import { lazy, Suspense } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import TrustBar from "@/components/conversion/TrustBar";
import InlineQuoteTeaser from "@/components/conversion/InlineQuoteTeaser";
import { findGardenCity, GARDEN_CITIES } from "./gardenCityData";

const Footer = lazy(() => import("@/components/landing/Footer"));

const GardenCityPage = () => {
  const { city: citySlug } = useParams<{ city: string }>();
  const city = findGardenCity(citySlug);
  if (!city) return <Navigate to="/virksomheder?category=Haveservice" replace />;

  const canonical = `/haveservice/${city.slug}`;
  const fullUrl = `https://serviceydere.dk${canonical}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Haveservice",
      provider: { "@type": "Organization", name: "Serviceydere", url: "https://serviceydere.dk/" },
      areaServed: { "@type": "City", name: city.name, "@id": fullUrl },
      name: `Haveservice i ${city.name}`,
      description: `Find haveservice i ${city.name}. Få op til 3 gratis tilbud, sammenlign priser og læs anmeldelser.`,
      offers: {
        "@type": "AggregateOffer", priceCurrency: "DKK",
        lowPrice: String(city.hourlyLow), highPrice: String(city.lawnHigh * 30),
        offerCount: "25+",
      },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Haveservice", item: "https://serviceydere.dk/virksomheder?category=Haveservice" },
        { "@type": "ListItem", position: 3, name: city.name, item: fullUrl },
      ],
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: `Hvad koster haveservice i ${city.name}?`, acceptedAnswer: { "@type": "Answer", text: `Haveservice i ${city.name} koster typisk ${city.hourlyLow}–${city.hourlyHigh} kr. i timen. Græsslåning ${city.lawnLow}–${city.lawnHigh} kr. pr. besøg og hækklipning ${city.hedgeLow}–${city.hedgeHigh} kr. pr. lbm.` } },
        { "@type": "Question", name: `Kan jeg få fradrag på haveservice?`, acceptedAnswer: { "@type": "Answer", text: `Ja — haveservice er omfattet af BoligJob-ordningens serviceydelser. Du kan i 2026 trække op til 11.900 kr. fra pr. person på arbejdsløn ved elektronisk betaling.` } },
        { "@type": "Question", name: `Er fast aftale billigere end engangsbesøg?`, acceptedAnswer: { "@type": "Answer", text: `Ja — abonnement (typisk 14-dages besøg) er ofte 15–25% billigere pr. besøg end engangsbestilling, fordi firmaet kan optimere ruter og udstyr.` } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Haveservice i ${city.name} – Priser & tilbud 2026`}
        description={`Find haveservice i ${city.name}. Fra ${city.hourlyLow} kr./time. Få op til 3 gratis tilbud på græsslåning, hækklipning og havevedligehold.`}
        canonicalPath={canonical}
        keywords={`haveservice ${city.name}, havemand ${city.name}, græsslåning ${city.name}, hækklipning ${city.name}, havefirma ${city.name}`}
        ogType="website"
        jsonLd={jsonLd}
      />
      <SiteNav />

      <main id="main" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <nav aria-label="Brødkrummer" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Forside</Link>
          <span className="mx-2">/</span>
          <Link to="/virksomheder?category=Haveservice" className="hover:text-foreground">Haveservice</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{city.name}</span>
        </nav>

        <article className="prose prose-neutral max-w-none dark:prose-invert">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Haveservice · {city.region} · Opdateret 2026
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Haveservice i {city.name}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Find og book verificerede havemænd og havefirmaer i {city.name} og hele {city.region}.
            Få op til 3 gratis tilbud på græsslåning, hækklipning og fast havepasning.
          </p>

          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">{city.name} kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Timepris: <strong>{city.hourlyLow}–{city.hourlyHigh} kr./time</strong></li>
              <li>• Græsslåning pr. besøg: <strong>{city.lawnLow}–{city.lawnHigh} kr.</strong></li>
              <li>• Hækklipning pr. lbm.: <strong>{city.hedgeLow}–{city.hedgeHigh} kr.</strong></li>
              <li>• Postnumre: <strong>{city.postalRange}</strong></li>
            </ul>
          </div>

          <TrustBar />
          <InlineQuoteTeaser
            category="Haveservice"
            heading={`Få 3 gratis tilbud på haveservice i ${city.name}`}
          />

          <h2>Havemarkedet i {city.name}</h2>
          <p>{city.intro}</p>
          <p>{city.localFactor}</p>

          <h2>Priser på haveservice i {city.name}</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr><th className="px-4 py-3 font-semibold">Opgave</th><th className="px-4 py-3 font-semibold">Pris i {city.name}</th><th className="px-4 py-3 font-semibold">Enhed</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">Timepris havemand</td><td className="px-4 py-3">{city.hourlyLow}–{city.hourlyHigh} kr.</td><td className="px-4 py-3">Pr. time</td></tr>
                <tr><td className="px-4 py-3">Græsslåning (alm. parcelhus)</td><td className="px-4 py-3">{city.lawnLow}–{city.lawnHigh} kr.</td><td className="px-4 py-3">Pr. besøg</td></tr>
                <tr><td className="px-4 py-3">Hækklipning</td><td className="px-4 py-3">{city.hedgeLow}–{city.hedgeHigh} kr.</td><td className="px-4 py-3">Pr. løbende meter</td></tr>
                <tr><td className="px-4 py-3">Forårsoprydning</td><td className="px-4 py-3">1.500–4.500 kr.</td><td className="px-4 py-3">Fast pris</td></tr>
                <tr><td className="px-4 py-3">Bortskaffelse af haveaffald</td><td className="px-4 py-3">350–950 kr.</td><td className="px-4 py-3">Pr. m³</td></tr>
              </tbody>
            </table>
            <p className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              Vejledende priser inkl. moms · Opdateret 2026
            </p>
          </div>

          <h2>Typiske opgaver i {city.name}</h2>
          <ul>{city.popularTasks.map((t) => <li key={t}>{t}</li>)}</ul>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Få tilbud på haveservice i {city.name}</h2>
            <p className="mt-2 text-foreground/80">
              Beskriv din have én gang — modtag op til 3 uforpligtende tilbud fra lokale havefirmaer.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to="/virksomheder?category=Haveservice" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se havefirmaer</Link>
            </div>
          </div>

          <h2>Andre byer</h2>
          <p className="text-sm">
            Haveservice i andre danske byer:{" "}
            {GARDEN_CITIES.filter((c) => c.slug !== city.slug).map((c, i, arr) => (
              <span key={c.slug}>
                <Link to={`/haveservice/${c.slug}`} className="underline">{c.name}</Link>
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

export default GardenCityPage;