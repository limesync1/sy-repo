import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";

const Footer = lazy(() => import("@/components/landing/Footer"));

// Prisguide: "vvs pris" (590/md), "vvs udkald pris" (260/md), "blikkenslager pris" (390/md)
const PlumberPriceGuide = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "VVS pris 2026 — udkald, timepris og typiske opgaver",
      description: "Hvad koster en VVS'er? Se priser på udkald, timepris, akut hjælp og typiske opgaver som vandhane, toilet og varmepumpe.",
      datePublished: "2026-06-20",
      dateModified: "2026-06-20",
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: { "@type": "Organization", name: "Serviceydere", logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" } },
      mainEntityOfPage: "https://serviceydere.dk/priser/vvs",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://serviceydere.dk/guides" },
        { "@type": "ListItem", position: 3, name: "VVS", item: "https://serviceydere.dk/priser/vvs" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Hvad koster en VVS'er i timen?", acceptedAnswer: { "@type": "Answer", text: "En VVS'er koster typisk 550–800 kr. i timen inkl. moms i dagtimerne. Akut hjælp aften/weekend ligger på 900–1.500 kr. i timen." } },
        { "@type": "Question", name: "Hvad koster et VVS-udkald?", acceptedAnswer: { "@type": "Answer", text: "Udkald i dagtimerne koster typisk 450–800 kr. inkl. første 30 min. Akut udkald aften, nat eller weekend: 900–1.800 kr." } },
        { "@type": "Question", name: "Hvad koster udskiftning af et toilet?", acceptedAnswer: { "@type": "Answer", text: "Udskiftning af toilet koster typisk 3.500–6.500 kr. inkl. toilet, arbejdsløn og bortskaffelse. Vægmonteret koster 1.500–3.000 kr. mere." } },
        { "@type": "Question", name: "Hvad koster installation af varmepumpe?", acceptedAnswer: { "@type": "Answer", text: "En luft-til-luft varmepumpe koster typisk 18.000–32.000 kr. fuldt installeret. Luft-til-vand ligger på 90.000–160.000 kr. (kan udløse energifradrag)." } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="VVS pris 2026 | Timepris, udkald & typiske opgaver"
        description="Hvad koster en VVS'er? Se timepris, udkald, akutpriser og typiske opgaver som toilet, varmepumpe og rørarbejde."
        canonicalPath="/priser/vvs"
        keywords="vvs pris, vvs udkald pris, vvs timepris, blikkenslager pris, hvad koster en vvs, akut vvs pris, varmepumpe pris"
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />

      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <nav aria-label="Brødkrummer" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Forside</Link>
          <span className="mx-2">/</span>
          <Link to="/guides" className="hover:text-foreground">Guides</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">VVS</span>
        </nav>

        <article className="prose prose-neutral max-w-none dark:prose-invert">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Prisguide · Opdateret juni 2026</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">VVS pris i 2026 — udkald, timepris og opgaver</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Komplet overblik over priser hos en VVS'er — timepris, udkald, akut hjælp og typiske
            opgaver fra dryppende vandhane til varmepumpe.
          </p>

          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Timepris (dagtimer): <strong>550–800 kr.</strong> inkl. moms</li>
              <li>• Akut aften/weekend: <strong>900–1.500 kr./time</strong></li>
              <li>• Udkald: <strong>450–800 kr.</strong> (akut: 900–1.800 kr.)</li>
              <li>• Toiletudskiftning: <strong>3.500–6.500 kr.</strong></li>
            </ul>
          </div>

          <h2>Priser efter opgave</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground"><tr><th className="px-4 py-3 font-semibold">Opgave</th><th className="px-4 py-3 font-semibold">Pris (inkl. moms)</th><th className="px-4 py-3 font-semibold">Tid</th></tr></thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">Skift vandhane</td><td className="px-4 py-3">1.200–2.400 kr.</td><td className="px-4 py-3">1–2 timer</td></tr>
                <tr><td className="px-4 py-3">Skift toilet</td><td className="px-4 py-3">3.500–6.500 kr.</td><td className="px-4 py-3">2–4 timer</td></tr>
                <tr><td className="px-4 py-3">Skift cirkulationspumpe</td><td className="px-4 py-3">3.500–7.000 kr.</td><td className="px-4 py-3">2–3 timer</td></tr>
                <tr><td className="px-4 py-3">Akut rørbrud</td><td className="px-4 py-3">2.500–8.000 kr.</td><td className="px-4 py-3">1–4 timer</td></tr>
                <tr><td className="px-4 py-3">Luft-til-luft varmepumpe</td><td className="px-4 py-3">18.000–32.000 kr.</td><td className="px-4 py-3">1 dag</td></tr>
                <tr><td className="px-4 py-3">Luft-til-vand varmepumpe</td><td className="px-4 py-3">90.000–160.000 kr.</td><td className="px-4 py-3">2–4 dage</td></tr>
              </tbody>
            </table>
          </div>

          <h2>Faktorer der påvirker prisen</h2>
          <ol>
            <li><strong>Tidspunkt</strong> — akut aften/weekend er 50–100% dyrere.</li>
            <li><strong>Tilgængelighed</strong> — rør bag fliser eller indstøbte rør koster mere.</li>
            <li><strong>Materialevalg</strong> — designarmaturer kan tredoble komponentudgiften.</li>
            <li><strong>Bortskaffelse</strong> — gamle kedler/toiletter koster 200–600 kr. at få fjernet.</li>
            <li><strong>Fast tilbud vs. timepris</strong> — fast tilbud giver budgetsikkerhed ved planlagt arbejde.</li>
          </ol>

          <h2>Sådan undgår du overraskelser på regningen</h2>
          <ul>
            <li>Få <strong>skriftligt tilbud</strong> før arbejdet starter — også på akutopgaver hvis muligt.</li>
            <li>Bed om <strong>specificeret faktura</strong> med opdeling af arbejdsløn, materialer og kørsel.</li>
            <li>Brug <strong>VVS'er med autorisation</strong> — vand- og afløbsarbejde er lovkrav.</li>
            <li>Tjek om opgaven er omfattet af <strong>energifradrag</strong> (varmepumpe, isolering).</li>
          </ul>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Find en VVS'er nu</h2>
            <p className="mt-2 text-foreground/80">Akut eller planlagt — få op til 3 gratis tilbud fra autoriserede VVS'ere i dit område.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to="/virksomheder?category=VVS" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se VVS-firmaer</Link>
            </div>
          </div>

          <h2>Ofte stillede spørgsmål</h2>
          <h3>Hvad koster en VVS'er i timen?</h3>
          <p>550–800 kr. inkl. moms i dagtimerne. Akut aften/weekend: 900–1.500 kr.</p>
          <h3>Hvad koster et akut udkald?</h3>
          <p>900–1.800 kr. aften, nat eller weekend, inkl. første 30 minutter.</p>
          <h3>Skal jeg bruge en autoriseret VVS'er?</h3>
          <p>Ja — vand-, gas- og afløbsarbejde er lovkrav at få udført af en autoriseret VVS-installatør.</p>
        </article>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default PlumberPriceGuide;