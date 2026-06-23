import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import ArticleFaqSection from "@/components/content/ArticleFaqSection";

const Footer = lazy(() => import("@/components/landing/Footer"));

// Prisguide: "hvad koster en håndværker" (1.300/md), "tømrer pris" (590/md)
const HandymanPriceGuide = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Hvad koster en håndværker i timen? Prisguide 2026",
      description:
        "Komplet oversigt over timepriser for tømrer, murer, snedker og alm. håndværker i Danmark — inkl. udkald, materialer og BoligJob-fradrag.",
      datePublished: "2026-06-20",
      dateModified: "2026-06-20",
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: {
        "@type": "Organization",
        name: "Serviceydere",
        logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" },
      },
      mainEntityOfPage: "https://serviceydere.dk/priser/haandvaerker",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://serviceydere.dk/guides" },
        { "@type": "ListItem", position: 3, name: "Håndværker", item: "https://serviceydere.dk/priser/haandvaerker" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Hvad koster en håndværker i timen i 2026?", acceptedAnswer: { "@type": "Answer", text: "En håndværker koster typisk 450–750 kr. i timen inkl. moms. Tømrer og snedker ligger på 500–700 kr., murer på 450–650 kr., og specialiserede fag (gulvlægning, totalrenovering) på 600–850 kr." } },
        { "@type": "Question", name: "Hvad koster udkald?", acceptedAnswer: { "@type": "Answer", text: "Udkald ligger typisk på 350–600 kr. inkl. de første 30 min. Mange håndværkere fakturerer minimum 1 time uanset opgavens størrelse." } },
        { "@type": "Question", name: "Kan jeg få BoligJob-fradrag på håndværkerregningen?", acceptedAnswer: { "@type": "Answer", text: "Ja — arbejdslønnen (ikke materialer) er fradragsberettiget med op til 8.600 kr. pr. voksen i 2026 for håndværkerydelser i hjemmet. Firmaet skal være momsregistreret." } },
        { "@type": "Question", name: "Hvad er forskellen på timepris og fast tilbud?", acceptedAnswer: { "@type": "Answer", text: "Timepris bruges når omfanget er svært at vurdere. Fast tilbud (entreprise) giver budgetsikkerhed på definerede opgaver — fx en nyt tag, et badeværelse eller en tilbygning." } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Hvad koster en håndværker i 2026? Prisguide & timepriser"
        description="Se priser på håndværker, tømrer, murer og snedker. Timepris, udkald, materialer og BoligJob-fradrag — alt du skal vide før du indhenter tilbud."
        canonicalPath="/priser/haandvaerker"
        keywords="håndværker pris, hvad koster en håndværker, tømrer pris, murer pris, snedker pris, håndværker timepris, boligjob håndværker"
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Guides", to: "/guides" },
          { label: "Håndværker" },
        ]}
        eyebrow="Prisguide · Opdateret juni 2026"
        title="Hvad koster en håndværker i 2026?"
        subtitle="Få det fulde overblik over timepriser, udkaldsgebyrer, materialer og fradragsregler for tømrer, murer, snedker og alm. håndværkerarbejde i Danmark."
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="article-content prose prose-neutral dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>Tømrer/snedker: <strong>500–700 kr./time</strong> inkl. moms</li>
              <li>Murer: <strong>450–650 kr./time</strong></li>
              <li>Udkald: <strong>350–600 kr.</strong> (inkl. første 30 min.)</li>
              <li>Håndværkerfradrag 2026: op til <strong>8.600 kr./person</strong></li>
            </ul>
          </div>

          <h2>Timepriser efter fag</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr><th className="px-4 py-3 font-semibold">Fag</th><th className="px-4 py-3 font-semibold">Timepris (inkl. moms)</th><th className="px-4 py-3 font-semibold">Typisk opgave</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">Tømrer</td><td className="px-4 py-3">500–700 kr.</td><td className="px-4 py-3">Vinduer, døre, gulve, tag</td></tr>
                <tr><td className="px-4 py-3">Snedker</td><td className="px-4 py-3">525–725 kr.</td><td className="px-4 py-3">Køkken, indbyg, finsnedkeri</td></tr>
                <tr><td className="px-4 py-3">Murer</td><td className="px-4 py-3">450–650 kr.</td><td className="px-4 py-3">Facade, fliser, fundament</td></tr>
                <tr><td className="px-4 py-3">Alm. håndværker</td><td className="px-4 py-3">400–600 kr.</td><td className="px-4 py-3">Småreparationer, montage</td></tr>
                <tr><td className="px-4 py-3">Specialist (renovering)</td><td className="px-4 py-3">600–850 kr.</td><td className="px-4 py-3">Badeværelse, tilbygning</td></tr>
              </tbody>
            </table>
          </div>

          <h2>Faktorer der påvirker prisen</h2>
          <ol>
            <li><strong>Geografi</strong> — Hovedstaden ligger 10–20% over Vestjylland.</li>
            <li><strong>Opgavens kompleksitet</strong> — gamle huse, asbest eller skæve mål øger timeforbruget.</li>
            <li><strong>Materialer</strong> — kan udgøre 40–60% af regningen ved større opgaver.</li>
            <li><strong>Tilgængelighed</strong> — etage uden elevator, snæver kælder mv. koster ekstra.</li>
            <li><strong>Tid på året</strong> — forår/sommer er højsæson; pris og ventetid stiger.</li>
          </ol>

          <h2>Eksempel: Nyt køkken</h2>
          <p>
            Et standard køkken på 12 m² med ny IKEA-bordplade, hvidevarer og el-arbejde koster typisk
            <strong> 45.000–85.000 kr.</strong> inkl. arbejdsløn (cirka 25–35 timers håndværker).
            Med håndværkerfradrag falder arbejdslønnen reelt med op til 25%.
          </p>

          <h2>Håndværkerfradrag 2026</h2>
          <p>
            Du kan trække <strong>op til 8.600 kr. pr. voksen</strong> fra for håndværkerydelser
            (energiforbedring, isolering, vinduer, varmepumpe m.m.). Servicedelen (rengøring, have)
            tæller særskilt med op til 12.300 kr. Firmaet skal være momsregistreret og du skal
            betale digitalt.
          </p>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Få 3 gratis tilbud fra håndværkere</h2>
            <p className="mt-2 text-foreground/80">Beskriv din opgave, og få op til 3 uforpligtende tilbud fra verificerede håndværkere i dit område.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to="/virksomheder?category=T%C3%B8mrer" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se tømrere</Link>
              <Link to="/virksomheder?category=Murer" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se murere</Link>
              <Link to="/virksomheder?category=Maler" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se malere</Link>
            </div>
          </div>

          <ArticleFaqSection
            items={[
              { q: "Hvad koster en håndværker i timen?", a: "Typisk 450–750 kr. inkl. moms afhængigt af fag og geografi." },
              { q: "Hvad koster et udkald?", a: "350–600 kr. inkl. de første 30 minutter. Mange fakturerer minimum 1 time." },
              { q: "Kan jeg få fradrag på regningen?", a: "Ja — arbejdsløn er fradragsberettiget med op til 8.600 kr./person i 2026, hvis firmaet er momsregistreret." },
            ]}
          />
        </article>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default HandymanPriceGuide;