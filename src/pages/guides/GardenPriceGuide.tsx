import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";

const Footer = lazy(() => import("@/components/landing/Footer"));

// Prisguide: "haveservice pris", "havemand pris", "græsslåning pris", "hækklipning pris"
const GardenPriceGuide = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Haveservice priser 2026 — timepris, abonnement og opgaver",
      description: "Hvad koster haveservice? Se timepris, græsslåning, hækklipning og fast abonnement — og hvad du sparer med BoligJob-fradraget.",
      datePublished: "2026-06-20",
      dateModified: "2026-06-20",
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: { "@type": "Organization", name: "Serviceydere", logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" } },
      mainEntityOfPage: "https://serviceydere.dk/priser/haveservice",
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://serviceydere.dk/guides" },
        { "@type": "ListItem", position: 3, name: "Haveservice", item: "https://serviceydere.dk/priser/haveservice" },
      ],
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Hvad koster en havemand i timen?", acceptedAnswer: { "@type": "Answer", text: "En havemand koster typisk 325–595 kr. i timen inkl. moms i 2026. Faste aftaler ligger ofte 15–25% lavere end engangsbesøg." } },
        { "@type": "Question", name: "Hvad koster græsslåning?", acceptedAnswer: { "@type": "Answer", text: "Græsslåning af et alm. parcelhus (200–400 m² græs) koster 275–750 kr. pr. besøg afhængig af by og adgang. Inkl. afklip og bortskaffelse." } },
        { "@type": "Question", name: "Hvad koster hækklipning?", acceptedAnswer: { "@type": "Answer", text: "Hækklipning koster 24–75 kr. pr. løbende meter. Højde over 2 meter giver typisk 30–50% tillæg pga. stilladsbehov." } },
        { "@type": "Question", name: "Kan jeg få fradrag på haveservice?", acceptedAnswer: { "@type": "Answer", text: "Ja — haveservice indgår i BoligJob-ordningens serviceydelser med op til 11.900 kr./person i 2026. Kræver elektronisk betaling og specificeret faktura." } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Haveservice pris 2026 | Timepris, abonnement & opgaver"
        description="Hvad koster en havemand? Se priser på græsslåning, hækklipning, fast abonnement og BoligJob-fradraget."
        canonicalPath="/priser/haveservice"
        keywords="haveservice pris, havemand pris, græsslåning pris, hækklipning pris, havefirma pris, haveservice abonnement"
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />

      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <nav aria-label="Brødkrummer" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Forside</Link><span className="mx-2">/</span>
          <Link to="/guides" className="hover:text-foreground">Guides</Link><span className="mx-2">/</span>
          <span className="text-foreground">Haveservice</span>
        </nav>

        <article className="prose prose-neutral max-w-none dark:prose-invert">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Prisguide · Opdateret juni 2026</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Haveservice priser i 2026</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Komplet prisguide til haveservice i Danmark — timepris, fast abonnement, græsslåning, hækklipning og BoligJob-fradraget.
          </p>

          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Timepris havemand: <strong>325–595 kr.</strong> inkl. moms</li>
              <li>• Græsslåning pr. besøg: <strong>275–750 kr.</strong></li>
              <li>• Hækklipning pr. lbm.: <strong>24–75 kr.</strong></li>
              <li>• Fradrag (BoligJob): <strong>op til 11.900 kr./person</strong></li>
            </ul>
          </div>

          <h2>Priser efter opgave</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground"><tr><th className="px-4 py-3 font-semibold">Opgave</th><th className="px-4 py-3 font-semibold">Pris</th><th className="px-4 py-3 font-semibold">Bemærk</th></tr></thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">Timepris havemand</td><td className="px-4 py-3">325–595 kr.</td><td className="px-4 py-3">Pr. time</td></tr>
                <tr><td className="px-4 py-3">Græsslåning, lille have (&lt;200 m²)</td><td className="px-4 py-3">275–450 kr.</td><td className="px-4 py-3">Pr. besøg</td></tr>
                <tr><td className="px-4 py-3">Græsslåning, mellem (200–500 m²)</td><td className="px-4 py-3">400–650 kr.</td><td className="px-4 py-3">Pr. besøg</td></tr>
                <tr><td className="px-4 py-3">Græsslåning, stor (500+ m²)</td><td className="px-4 py-3">600–1.200 kr.</td><td className="px-4 py-3">Pr. besøg</td></tr>
                <tr><td className="px-4 py-3">Hækklipning</td><td className="px-4 py-3">24–75 kr.</td><td className="px-4 py-3">Pr. lbm.</td></tr>
                <tr><td className="px-4 py-3">Forårsoprydning</td><td className="px-4 py-3">1.500–4.500 kr.</td><td className="px-4 py-3">Fast pris</td></tr>
                <tr><td className="px-4 py-3">Bortskaffelse af haveaffald</td><td className="px-4 py-3">350–950 kr.</td><td className="px-4 py-3">Pr. m³</td></tr>
                <tr><td className="px-4 py-3">Snerydning (abonnement)</td><td className="px-4 py-3">2.500–6.000 kr.</td><td className="px-4 py-3">Pr. sæson</td></tr>
              </tbody>
            </table>
          </div>

          <h2>Abonnement vs. engangsbesøg</h2>
          <p>
            Et fast abonnement (typisk 14-dages besøg i sæsonen april–oktober) er ofte 15–25% billigere
            pr. besøg end engangsbestilling, fordi firmaet kan optimere ruter og udstyr. Til gengæld
            binder du dig typisk til hele sæsonen.
          </p>

          <h2>Hvad påvirker prisen?</h2>
          <ol>
            <li><strong>Have-størrelse</strong> — pris pr. m² falder med størrelsen.</li>
            <li><strong>Adgang</strong> — etagebyggeri og smalle haver kræver håndbåret udstyr.</li>
            <li><strong>Bortskaffelse</strong> — afregnes oftest pr. m³ haveaffald.</li>
            <li><strong>Sæson</strong> — forår og efterår er typisk 10–15% dyrere pga. peak.</li>
            <li><strong>Geografi</strong> — Sjælland generelt 10–20% dyrere end Jylland/Fyn.</li>
          </ol>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Få tilbud på haveservice</h2>
            <p className="mt-2 text-foreground/80">Få op til 3 gratis tilbud fra lokale havefirmaer.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to="/virksomheder?category=Haveservice" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se havefirmaer</Link>
            </div>
          </div>
        </article>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default GardenPriceGuide;