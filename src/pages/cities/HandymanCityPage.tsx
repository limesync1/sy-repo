import { lazy, Suspense } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import TrustBar from "@/components/conversion/TrustBar";
import InlineQuoteTeaser from "@/components/conversion/InlineQuoteTeaser";
import { findHandymanCity, HANDYMAN_CITIES } from "./handymanCityData";

const Footer = lazy(() => import("@/components/landing/Footer"));

/** By-specifik landingsside for håndværker. Renderes ud fra :city param. */
const HandymanCityPage = () => {
  const { city: citySlug } = useParams<{ city: string }>();
  const city = findHandymanCity(citySlug);
  if (!city) return <Navigate to="/virksomheder" replace />;

  const canonical = `/haandvaerker/${city.slug}`;
  const fullUrl = `https://serviceydere.dk${canonical}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Håndværker",
      provider: { "@type": "Organization", name: "Serviceydere", url: "https://serviceydere.dk/" },
      areaServed: { "@type": "City", name: city.name, "@id": fullUrl },
      name: `Håndværker i ${city.name}`,
      description: `Find håndværkere i ${city.name}. Få op til 3 gratis tilbud, sammenlign timepriser og læs anmeldelser.`,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "DKK",
        lowPrice: String(city.hourlyLow),
        highPrice: String(city.electricianHigh),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Håndværker", item: "https://serviceydere.dk/virksomheder" },
        { "@type": "ListItem", position: 3, name: city.name, item: fullUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: `Hvad koster en håndværker i ${city.name}?`, acceptedAnswer: { "@type": "Answer", text: `En alm. håndværker i ${city.name} koster typisk ${city.hourlyLow}–${city.hourlyHigh} kr. i timen inkl. moms. Tømrer ligger på ${city.carpenterLow}–${city.carpenterHigh} kr. og elektriker på ${city.electricianLow}–${city.electricianHigh} kr.` } },
        { "@type": "Question", name: `Hvad koster udkald af håndværker i ${city.name}?`, acceptedAnswer: { "@type": "Answer", text: `Udkald i ${city.name} koster typisk ${city.callOutLow}–${city.callOutHigh} kr. og dækker kørsel og opstart. Akutudkald uden for normal arbejdstid kan være op til dobbelt så meget.` } },
        { "@type": "Question", name: `Kan jeg få BoligJob-fradrag på håndværker i ${city.name}?`, acceptedAnswer: { "@type": "Answer", text: `Ja — du kan trække op til 17.500 kr. fra på arbejdsløn i 2026 for håndværksydelser som maler, tømrer, vvs og elektriker. Materialer er ikke omfattet.` } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Håndværker i ${city.name} – Timepriser & tilbud 2026`}
        description={`Find lokale håndværkere i ${city.name}. Timepris fra ${city.hourlyLow} kr. Få op til 3 gratis tilbud fra verificerede håndværkere i ${city.region}.`}
        canonicalPath={canonical}
        keywords={`håndværker ${city.name}, tømrer ${city.name}, elektriker ${city.name}, håndværker pris ${city.name}, billig håndværker ${city.name}`}
        ogType="website"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Håndværker", to: "/virksomheder" },
          { label: city.name },
        ]}
        eyebrow={`Håndværker · ${city.region} · Opdateret 2026`}
        title={`Håndværker i ${city.name}`}
        subtitle={`Find og book lokale, verificerede håndværkere i ${city.name} og hele ${city.region}. Få op til 3 gratis tilbud — sammenlign timepriser, anmeldelser og tilgængelighed.`}
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="article-content prose prose-neutral dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">{city.name} kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>Alm. håndværker: <strong>{city.hourlyLow}–{city.hourlyHigh} kr./time</strong> inkl. moms</li>
              <li>Tømrer: <strong>{city.carpenterLow}–{city.carpenterHigh} kr./time</strong></li>
              <li>Elektriker: <strong>{city.electricianLow}–{city.electricianHigh} kr./time</strong></li>
              <li>Udkald: <strong>{city.callOutLow}–{city.callOutHigh} kr.</strong></li>
              <li>Postnumre: <strong>{city.postalRange}</strong></li>
            </ul>
          </div>

          <TrustBar />
          <InlineQuoteTeaser
            heading={`Få 3 gratis tilbud fra håndværkere i ${city.name}`}
          />

          <h2>Håndværker-markedet i {city.name}</h2>
          <p>{city.intro}</p>
          <p>{city.localFactor}</p>

          <h2>Timepriser på håndværker i {city.name}</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Pris i {city.name}</th><th className="px-4 py-3 font-semibold">Bemærk</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">Alm. håndværker</td><td className="px-4 py-3">{city.hourlyLow}–{city.hourlyHigh} kr./time</td><td className="px-4 py-3">Min. 1 time</td></tr>
                <tr><td className="px-4 py-3">Tømrer</td><td className="px-4 py-3">{city.carpenterLow}–{city.carpenterHigh} kr./time</td><td className="px-4 py-3">Inkl. mindre værktøj</td></tr>
                <tr><td className="px-4 py-3">Elektriker</td><td className="px-4 py-3">{city.electricianLow}–{city.electricianHigh} kr./time</td><td className="px-4 py-3">Autoriseret</td></tr>
                <tr><td className="px-4 py-3">Udkald</td><td className="px-4 py-3">{city.callOutLow}–{city.callOutHigh} kr.</td><td className="px-4 py-3">Kørsel + opstart</td></tr>
                <tr><td className="px-4 py-3">Akutudkald</td><td className="px-4 py-3">+50–100% tillæg</td><td className="px-4 py-3">Aften, nat, weekend</td></tr>
              </tbody>
            </table>
            <p className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              Vejledende priser inkl. moms · Opdateret 2026
            </p>
          </div>

          <h2>Populære opgaver i {city.name}</h2>
          <ul>{city.popularTasks.map((t) => <li key={t}>{t}</li>)}</ul>

          <h2>Sådan vælger du en håndværker i {city.name}</h2>
          <ol>
            <li><strong>Indhent 3 tilbud</strong> — sammenlign timepris og fast pris.</li>
            <li><strong>Tjek CVR og forsikring</strong> — autorisationskrav gælder for el og vvs.</li>
            <li><strong>Bed om skriftlig aftale</strong> med materiale- og tidsestimat.</li>
            <li><strong>Brug BoligJob-fradraget</strong> — kræver elektronisk betaling.</li>
            <li><strong>Læs anmeldelser</strong> — fokusér på opgaver der ligner din.</li>
          </ol>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Få tilbud fra håndværkere i {city.name}</h2>
            <p className="mt-2 text-foreground/80">
              Beskriv opgaven én gang — modtag op til 3 uforpligtende tilbud fra verificerede
              håndværkere i {city.name}.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to="/virksomheder?category=T%C3%B8mrer" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se tømrere</Link>
              <Link to="/virksomheder?category=Murer" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se murere</Link>
              <Link to="/virksomheder?category=Maler" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se malere</Link>
            </div>
          </div>

          <h2>Andre byer</h2>
          <p className="text-sm">
            Håndværker i andre danske byer:{" "}
            {HANDYMAN_CITIES.filter((c) => c.slug !== city.slug).map((c, i, arr) => (
              <span key={c.slug}>
                <Link to={`/haandvaerker/${c.slug}`} className="underline">{c.name}</Link>
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

export default HandymanCityPage;