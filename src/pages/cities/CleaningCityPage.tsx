import { lazy, Suspense } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import TrustBar from "@/components/conversion/TrustBar";
import InlineQuoteTeaser from "@/components/conversion/InlineQuoteTeaser";
import { findCity } from "./cleaningCityData";

const Footer = lazy(() => import("@/components/landing/Footer"));

/**
 * By-specifik landingsside for rengøring. Renderes ud fra :city param og
 * konfiguration i cleaningCityData.ts. Hver by får unikt indhold (priser,
 * kvarterer, eksempler) så Google ikke ser dem som duplicate content.
 * Mål-keywords: "rengøring [by]", "rengøringsfirma [by]", "rengøringshjælp [by]".
 */
const CleaningCityPage = () => {
  const { city: citySlug } = useParams<{ city: string }>();
  const city = findCity(citySlug);
  if (!city) return <Navigate to="/virksomheder?category=Reng%C3%B8ring" replace />;

  const canonical = `/rengoering/${city.slug}`;
  const fullUrl = `https://serviceydere.dk${canonical}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Rengøring",
      provider: {
        "@type": "Organization",
        name: "Serviceydere",
        url: "https://serviceydere.dk/",
      },
      areaServed: {
        "@type": "City",
        name: city.name,
        "@id": fullUrl,
      },
      name: `Rengøring i ${city.name}`,
      description: `Find og book rengøringsfirmaer i ${city.name}. Sammenlign priser, læs anmeldelser og få op til 3 gratis tilbud.`,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "DKK",
        lowPrice: String(city.hourlyLow),
        highPrice: String(city.hourlyHigh),
        offerCount: "50+",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Rengøring", item: "https://serviceydere.dk/virksomheder?category=Reng%C3%B8ring" },
        { "@type": "ListItem", position: 3, name: city.name, item: fullUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Hvad koster rengøring i ${city.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Rengøring i ${city.name} koster typisk ${city.hourlyLow}–${city.hourlyHigh} kr. i timen inkl. moms. Fast rengøring i en gennemsnitlig bolig ligger på ${city.flatLow}–${city.flatHigh} kr. pr. besøg hver 14. dag.`,
          },
        },
        {
          "@type": "Question",
          name: `Hvordan finder jeg et godt rengøringsfirma i ${city.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Indhent 3 tilbud, læs anmeldelser, tjek at firmaet er momsregistreret (giver BoligJob-fradrag) og bed om referencer fra lignende boliger i ${city.name}.`,
          },
        },
        {
          "@type": "Question",
          name: `Kan jeg få BoligJob-fradrag i ${city.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Ja — BoligJob-fradraget gælder i hele Danmark og giver op til 12.300 kr./voksen i fradrag i 2026. Firmaet skal være momsregistreret og du skal betale digitalt.`,
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Rengøring i ${city.name} – Find & sammenlign priser 2026`}
        description={`Find rengøringsfirmaer i ${city.name}. Timepris fra ${city.hourlyLow} kr. Få op til 3 gratis tilbud fra verificerede firmaer i ${city.region}.`}
        canonicalPath={canonical}
        keywords={`rengøring ${city.name}, rengøringsfirma ${city.name}, rengøringshjælp ${city.name}, privat rengøring ${city.name}, ${city.name} rengøring pris`}
        ogType="website"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Rengøring", to: "/virksomheder?category=Reng%C3%B8ring" },
          { label: city.name },
        ]}
        eyebrow={`Rengøring · ${city.region} · Opdateret 2026`}
        title={`Rengøring i ${city.name}`}
        subtitle={`Find og book verificerede rengøringsfirmaer i ${city.name} og hele ${city.region}. Sammenlign priser, læs anmeldelser, og få op til 3 gratis tilbud fra lokale udbydere.`}
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="prose prose-neutral max-w-4xl dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">{city.name} kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Timepris: <strong>{city.hourlyLow}–{city.hourlyHigh} kr.</strong> inkl. moms</li>
              <li>• Fast besøg (75 m², hver 14. dag): <strong>{city.flatLow}–{city.flatHigh} kr.</strong></li>
              <li>• Postnumre dækket: <strong>{city.postalRange}</strong></li>
              <li>• Befolkning: <strong>~{city.population}</strong></li>
            </ul>
          </div>

          <TrustBar />
          <InlineQuoteTeaser
            category="Rengøring"
            heading={`Få 3 gratis tilbud på rengøring i ${city.name}`}
          />

          <h2>Rengøringsmarkedet i {city.name}</h2>
          <p>{city.intro}</p>
          <p>{city.localFactor}</p>

          <h2>Priser på rengøring i {city.name}</h2>
          <p>
            Priserne nedenfor er vejledende timepriser inkl. moms for privatkunder i {city.name}.
            Faste aftaler ligger typisk i den lave ende, mens engangs- og hovedrengøring ligger højere.
          </p>

          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Pris i {city.name}</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">Fast privatrengøring</td>
                  <td className="px-4 py-3">{city.hourlyLow}–{city.hourlyLow + 60} kr./time</td>
                  <td className="px-4 py-3">Hver 1–2 uger</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Engangs hovedrengøring</td>
                  <td className="px-4 py-3">{city.hourlyHigh - 40}–{city.hourlyHigh} kr./time</td>
                  <td className="px-4 py-3">Min. 3 timer</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Flytterengøring (lejlighed)</td>
                  <td className="px-4 py-3">{Math.round(city.flatLow * 2.5)}–{Math.round(city.flatHigh * 4.5)} kr.</td>
                  <td className="px-4 py-3">Fast pris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Vinduespudsning villa</td>
                  <td className="px-4 py-3">{Math.round(city.hourlyLow * 1.3)}–{Math.round(city.hourlyHigh * 2)} kr./besøg</td>
                  <td className="px-4 py-3">Ud- og indvendigt</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Erhvervsrengøring</td>
                  <td className="px-4 py-3">8–{city.slug === "koebenhavn" ? 18 : 16} kr./m²/md.</td>
                  <td className="px-4 py-3">Fast aftale</td>
                </tr>
              </tbody>
            </table>
            <p className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              Privatpriser inkl. moms · Erhverv ekskl. moms · Opdateret 2026
            </p>
          </div>

          <h2>Eksempel: {city.exampleHomeType}</h2>
          <p>
            En {city.exampleHomeType.toLowerCase()} med rengøring hver 14. dag tager typisk 2 timer.
            Med en gennemsnitlig timepris i {city.name} på {Math.round((city.hourlyLow + city.hourlyHigh) / 2)} kr.
            lander du på cirka <strong>{Math.round(((city.hourlyLow + city.hourlyHigh) / 2) * 2)} kr. pr. besøg</strong>{" "}
            eller omkring <strong>{Math.round(((city.hourlyLow + city.hourlyHigh) / 2) * 2 * 2.2)} kr./md.</strong>{" "}
            Med BoligJob-fradrag falder den reelle udgift med op til 35%.
          </p>

          <h2>Områder vi dækker i {city.name}</h2>
          <p>
            Vores rengøringsfirmaer dækker hele {city.name} og {city.region} — inklusive postnumrene{" "}
            {city.postalRange}. De mest efterspurgte områder er:
          </p>
          <ul>
            {city.neighborhoods.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>

          <h2>Sådan vælger du et rengøringsfirma i {city.name}</h2>
          <ol>
            <li><strong>Indhent 3 tilbud</strong> — sammenlign timepris og inkluderede ydelser.</li>
            <li><strong>Tjek anmeldelser</strong> — kunder i {city.name} skriver om både kvalitet og pålidelighed.</li>
            <li><strong>Verificér CVR</strong> — kun momsregistrerede firmaer giver dig BoligJob-fradrag.</li>
            <li><strong>Bed om referencer</strong> — gerne fra lignende boliger i samme kvarter.</li>
            <li><strong>Aftal frekvens skriftligt</strong> — ugentlig, hver 14. dag eller månedlig.</li>
          </ol>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">
              Klar til at finde rengøringshjælp i {city.name}?
            </h2>
            <p className="mt-2 text-foreground/80">
              Få op til 3 gratis tilbud fra verificerede rengøringsfirmaer i {city.name} — eller
              browse profiler og book direkte.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/tilbud"
                className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90"
              >
                Få 3 gratis tilbud
              </Link>
              <Link
                to="/virksomheder?category=Reng%C3%B8ring"
                className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Se rengøringsfirmaer i {city.name}
              </Link>
            </div>
          </div>

          <h2>Andre byer</h2>
          <p className="text-sm">
            Se rengøringspriser og firmaer i andre danske byer:{" "}
            <Link to="/rengoering/koebenhavn" className="underline">København</Link>{" · "}
            <Link to="/rengoering/aarhus" className="underline">Aarhus</Link>{" · "}
            <Link to="/rengoering/odense" className="underline">Odense</Link>{" · "}
            <Link to="/rengoering/aalborg" className="underline">Aalborg</Link>{" · "}
            <Link to="/rengoering/esbjerg" className="underline">Esbjerg</Link>
          </p>
        </article>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default CleaningCityPage;