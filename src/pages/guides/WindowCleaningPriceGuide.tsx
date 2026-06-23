import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";

const Footer = lazy(() => import("@/components/landing/Footer"));

// Prisguide: "vinduespudser pris" (720/md), "hvad koster vinduespudser" (320/md)
const WindowCleaningPriceGuide = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Vinduespudser pris 2026 — hvad koster det?",
      description: "Komplet prisguide for vinduespudsning i hjem og erhverv. Pris pr. vindue, abonnement, faktorer og typiske eksempler.",
      datePublished: "2026-06-20",
      dateModified: "2026-06-20",
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: { "@type": "Organization", name: "Serviceydere", logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" } },
      mainEntityOfPage: "https://serviceydere.dk/priser/vinduespudser",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://serviceydere.dk/guides" },
        { "@type": "ListItem", position: 3, name: "Vinduespudsning", item: "https://serviceydere.dk/priser/vinduespudser" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Hvad koster en vinduespudser?", acceptedAnswer: { "@type": "Answer", text: "En vinduespudser koster typisk 25–45 kr. pr. vindue inkl. moms ved abonnement, eller 35–60 kr. pr. vindue ved engangsbesøg. Et standard parcelhus med 20–25 vinduer ligger på 500–1.200 kr. pr. besøg." } },
        { "@type": "Question", name: "Hvor ofte bør jeg få pudset vinduer?", acceptedAnswer: { "@type": "Answer", text: "De fleste private vælger 4–8 gange om året. Erhverv typisk månedligt. Bor du nær trafik, sø eller marker, anbefales hyppigere pudsning." } },
        { "@type": "Question", name: "Kan jeg få fradrag på vinduespudsning?", acceptedAnswer: { "@type": "Answer", text: "Ja — vinduespudsning er omfattet af BoligJob-servicefradraget med op til 12.300 kr./voksen i 2026. Firmaet skal være momsregistreret og du skal betale digitalt." } },
        { "@type": "Question", name: "Inkluderet ud- og indvendigt?", acceptedAnswer: { "@type": "Answer", text: "Standardpris dækker ofte kun udvendigt. Indvendigt koster typisk 50–80% ekstra. Aftal det skriftligt før første besøg." } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Vinduespudser pris 2026 | Pris pr. vindue & abonnement"
        description="Hvad koster en vinduespudser? Se priser pr. vindue, abonnement, BoligJob-fradrag og typiske eksempler for private og erhverv."
        canonicalPath="/priser/vinduespudser"
        keywords="vinduespudser pris, hvad koster vinduespudser, vinduespudsning pris, vinduespudser abonnement, vinduespudser villa"
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Guides", to: "/guides" },
          { label: "Vinduespudsning" },
        ]}
        eyebrow="Prisguide · Opdateret juni 2026"
        title="Vinduespudser pris i 2026"
        subtitle="Få overblik over priser pr. vindue, abonnement vs. engangsbesøg, fradragsregler og hvad der reelt påvirker prisen for vinduespudsning."
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="prose prose-neutral max-w-3xl dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Abonnement: <strong>25–45 kr./vindue</strong></li>
              <li>• Engangsbesøg: <strong>35–60 kr./vindue</strong></li>
              <li>• Standard villa (20–25 vinduer): <strong>500–1.200 kr./besøg</strong></li>
              <li>• BoligJob-fradrag dækker hele beløbet</li>
            </ul>
          </div>

          <h2>Pris efter type</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground"><tr><th className="px-4 py-3 font-semibold">Boligtype</th><th className="px-4 py-3 font-semibold">Pris ved abonnement</th><th className="px-4 py-3 font-semibold">Engangsbesøg</th></tr></thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">Lejlighed (5–8 vinduer)</td><td className="px-4 py-3">150–320 kr.</td><td className="px-4 py-3">200–450 kr.</td></tr>
                <tr><td className="px-4 py-3">Rækkehus (12–15 vinduer)</td><td className="px-4 py-3">350–600 kr.</td><td className="px-4 py-3">450–800 kr.</td></tr>
                <tr><td className="px-4 py-3">Standard villa (20–25 vinduer)</td><td className="px-4 py-3">500–1.000 kr.</td><td className="px-4 py-3">700–1.400 kr.</td></tr>
                <tr><td className="px-4 py-3">Stor villa (30+ vinduer)</td><td className="px-4 py-3">900–1.600 kr.</td><td className="px-4 py-3">1.200–2.200 kr.</td></tr>
                <tr><td className="px-4 py-3">Erhverv (pr. m² facade)</td><td className="px-4 py-3">12–25 kr./m²</td><td className="px-4 py-3">18–35 kr./m²</td></tr>
              </tbody>
            </table>
          </div>

          <h2>Faktorer der påvirker prisen</h2>
          <ol>
            <li><strong>Antal og størrelse</strong> — store sprosser tager længere tid pr. vindue.</li>
            <li><strong>Tilgængelighed</strong> — vinduer over 1. sal kræver stige eller teleskopstang.</li>
            <li><strong>Frekvens</strong> — abonnement er typisk 25–35% billigere end engangsbesøg.</li>
            <li><strong>Indvendigt</strong> — dobbeltsidet pudsning koster 50–80% ekstra.</li>
            <li><strong>Karm- og rammerengøring</strong> — afregnes ofte særskilt.</li>
          </ol>

          <h2>Eksempel: Villa med abonnement</h2>
          <p>
            En standard villa med <strong>22 vinduer</strong> og månedligt abonnement ligger typisk
            på <strong>650 kr. pr. besøg</strong>. Årligt: cirka <strong>7.800 kr.</strong> Med
            BoligJob-fradrag falder den reelle udgift til ca. 5.100 kr.
          </p>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Find en vinduespudser</h2>
            <p className="mt-2 text-foreground/80">Få op til 3 gratis tilbud — sammenlign abonnementspriser og leveringstider i dit område.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to="/virksomheder?category=Vinduespudsning" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se vinduespudsere</Link>
            </div>
          </div>

          <h2>Ofte stillede spørgsmål</h2>
          <h3>Hvad koster en vinduespudser?</h3>
          <p>25–45 kr./vindue ved abonnement, 35–60 kr./vindue ved engangsbesøg.</p>
          <h3>Hvor ofte bør jeg pudse vinduer?</h3>
          <p>4–8 gange årligt for private, månedligt for erhverv.</p>
          <h3>Kan jeg få fradrag?</h3>
          <p>Ja — fuldt omfattet af BoligJob-servicefradrag (op til 12.300 kr./voksen i 2026).</p>
        </article>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default WindowCleaningPriceGuide;