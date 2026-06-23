import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";

const Footer = lazy(() => import("@/components/landing/Footer"));

// Prisguide: "elektriker pris" (1.6k/md), "elektriker timepris" (480/md), "akut elektriker pris"
const ElectricianPriceGuide = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Article",
      headline: "Elektriker pris 2026 — timepris, udkald og opgaver",
      description: "Hvad koster en elektriker? Se timepris, udkald, akut hjælp og typiske el-opgaver som stikkontakter, HFI og ladestander.",
      datePublished: "2026-06-20", dateModified: "2026-06-20",
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: { "@type": "Organization", name: "Serviceydere", logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" } },
      mainEntityOfPage: "https://serviceydere.dk/priser/elektriker",
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://serviceydere.dk/guides" },
        { "@type": "ListItem", position: 3, name: "Elektriker", item: "https://serviceydere.dk/priser/elektriker" },
      ],
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Hvad koster en elektriker i timen?", acceptedAnswer: { "@type": "Answer", text: "En autoriseret elektriker koster typisk 495–895 kr. i timen inkl. moms i dagtimerne. Akut aften/weekend: 900–1.500 kr." } },
        { "@type": "Question", name: "Hvad koster et akut udkald?", acceptedAnswer: { "@type": "Answer", text: "Akut udkald aften/nat/weekend ligger på 950–2.000 kr. inkl. første 30 min. plus timepris." } },
        { "@type": "Question", name: "Hvad koster installation af ladestander?", acceptedAnswer: { "@type": "Answer", text: "En 11 kW hjemmeladestander koster typisk 8.500–18.000 kr. fuldt installeret. Pris afhænger af afstand til eltavle og evt. opgradering af gruppe." } },
        { "@type": "Question", name: "Skal jeg bruge en autoriseret elektriker?", acceptedAnswer: { "@type": "Answer", text: "Ja — alt fast el-arbejde over lavspænding er lovkrav at få udført af en autoriseret elinstallatør (autorisation kan tjekkes på Sikkerhedsstyrelsens hjemmeside)." } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Elektriker pris 2026 | Timepris, udkald & opgaver"
        description="Hvad koster en elektriker? Timepris, udkald, akut hjælp og typiske opgaver som HFI, stikkontakter og ladestander."
        canonicalPath="/priser/elektriker"
        keywords="elektriker pris, elektriker timepris, akut elektriker pris, elektriker udkald, ladestander pris, hvad koster en elektriker"
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Guides", to: "/guides" },
          { label: "Elektriker" },
        ]}
        eyebrow="Prisguide · Opdateret juni 2026"
        title="Elektriker pris i 2026"
        subtitle="Komplet overblik over priser hos en autoriseret elektriker — timepris, udkald, akut hjælp og typiske opgaver."
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="article-content prose prose-neutral dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Timepris (dagtimer): <strong>495–895 kr.</strong> inkl. moms</li>
              <li>• Akut aften/weekend: <strong>900–1.500 kr./time</strong></li>
              <li>• Udkald: <strong>450–850 kr.</strong> (akut: 950–2.000 kr.)</li>
              <li>• 11 kW ladestander: <strong>8.500–18.000 kr.</strong> installeret</li>
            </ul>
          </div>

          <h2>Priser efter opgave</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground"><tr><th className="px-4 py-3 font-semibold">Opgave</th><th className="px-4 py-3 font-semibold">Pris (inkl. moms)</th><th className="px-4 py-3 font-semibold">Tid</th></tr></thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">Skift stikkontakt</td><td className="px-4 py-3">450–950 kr.</td><td className="px-4 py-3">30–60 min</td></tr>
                <tr><td className="px-4 py-3">Skift HFI-relæ</td><td className="px-4 py-3">1.500–3.500 kr.</td><td className="px-4 py-3">1–2 timer</td></tr>
                <tr><td className="px-4 py-3">Ny gruppe i eltavle</td><td className="px-4 py-3">1.800–4.500 kr.</td><td className="px-4 py-3">2–3 timer</td></tr>
                <tr><td className="px-4 py-3">Opsætning af spots (pr. stk.)</td><td className="px-4 py-3">450–900 kr.</td><td className="px-4 py-3">30 min/stk</td></tr>
                <tr><td className="px-4 py-3">11 kW ladestander</td><td className="px-4 py-3">8.500–18.000 kr.</td><td className="px-4 py-3">3–6 timer</td></tr>
                <tr><td className="px-4 py-3">El-tjek af bolig</td><td className="px-4 py-3">1.800–3.500 kr.</td><td className="px-4 py-3">2–3 timer</td></tr>
                <tr><td className="px-4 py-3">Akut fejlfinding</td><td className="px-4 py-3">1.200–3.500 kr.</td><td className="px-4 py-3">1–3 timer</td></tr>
              </tbody>
            </table>
          </div>

          <h2>Faktorer der påvirker prisen</h2>
          <ol>
            <li><strong>Tidspunkt</strong> — akut aften/weekend er 50–100% dyrere.</li>
            <li><strong>Tilgængelighed</strong> — gamle installationer (skjulte rør, gips uden trækrør) tager længere tid.</li>
            <li><strong>Materialevalg</strong> — designarmaturer og smart-home komponenter koster betydeligt mere.</li>
            <li><strong>Behov for opgradering</strong> — ny gruppe, ny tavle eller stik-skift kan trækkes ind i en større opgave.</li>
          </ol>

          <h2>Sådan undgår du overraskelser</h2>
          <ul>
            <li>Få <strong>skriftligt tilbud</strong> ved planlagt arbejde over 2–3 timer.</li>
            <li>Tjek <strong>autorisationsnummer</strong> på el-sikkerhed.dk før du booker.</li>
            <li>Brug <strong>BoligJob-fradraget</strong> på arbejdsløn (op til 17.500 kr./person på grønne håndværkerydelser).</li>
            <li>Bed om <strong>specificeret faktura</strong> med opdeling af løn, materialer og kørsel.</li>
          </ul>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Find en elektriker nu</h2>
            <p className="mt-2 text-foreground/80">Akut eller planlagt — få op til 3 gratis tilbud fra autoriserede elektrikere.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to="/virksomheder?category=Elektriker" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se elektrikere</Link>
            </div>
          </div>
        </article>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default ElectricianPriceGuide;