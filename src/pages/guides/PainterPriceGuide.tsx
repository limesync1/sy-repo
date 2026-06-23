import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";

const Footer = lazy(() => import("@/components/landing/Footer"));

// Prisguide: "maler pris" (1.000/md), "maler pris pr m2" (880/md)
const PainterPriceGuide = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Maler pris pr. m² i 2026 — komplet prisguide",
      description: "Hvad koster en maler? Se m²-priser, timepris, faktorer og typiske eksempler for indvendigt og udvendigt malerarbejde i Danmark.",
      datePublished: "2026-06-20",
      dateModified: "2026-06-20",
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: { "@type": "Organization", name: "Serviceydere", logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" } },
      mainEntityOfPage: "https://serviceydere.dk/priser/maler",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://serviceydere.dk/guides" },
        { "@type": "ListItem", position: 3, name: "Maler", item: "https://serviceydere.dk/priser/maler" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Hvad koster en maler pr. m²?", acceptedAnswer: { "@type": "Answer", text: "En maler koster typisk 90–180 kr. pr. m² væg inkl. moms og materialer ved standard 2 gange maling. Lofter ligger på 110–200 kr./m², og træværk afregnes ofte pr. løbende meter." } },
        { "@type": "Question", name: "Hvad er en malers timepris?", acceptedAnswer: { "@type": "Answer", text: "Malere fakturerer typisk 425–625 kr. i timen inkl. moms. Specialopgaver (spartelpuds, tapet, ædelmaling) ligger højere." } },
        { "@type": "Question", name: "Hvad koster det at male et helt hus indvendigt?", acceptedAnswer: { "@type": "Answer", text: "Et standard parcelhus på 130 m² koster typisk 35.000–65.000 kr. at få malet komplet indvendigt (vægge, lofter, træværk) inkl. spartling og afdækning." } },
        { "@type": "Question", name: "Kan jeg få fradrag på malerregningen?", acceptedAnswer: { "@type": "Answer", text: "Indvendigt malerarbejde er ikke længere håndværkerfradragsberettiget (kun energi- og klimaforbedringer). Servicedelen er heller ikke omfattet. Vær opmærksom på de gældende regler." } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Maler pris pr. m² i 2026 | Prisguide & timepriser"
        description="Hvad koster en maler? Se m²-priser, timepris og typiske eksempler for indvendigt og udvendigt malerarbejde i Danmark."
        canonicalPath="/priser/maler"
        keywords="maler pris, maler pris pr m2, maler timepris, hvad koster en maler, maler pris villa, udvendig maling pris"
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Guides", to: "/guides" },
          { label: "Maler" },
        ]}
        eyebrow="Prisguide · Opdateret juni 2026"
        title="Maler pris i 2026 — pr. m² og pr. time"
        subtitle="Hvad koster det at få malet din bolig? Se realistiske priser pr. m² for vægge, lofter og træværk samt timepriser og eksempler på typiske opgaver."
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="prose prose-neutral mx-auto max-w-3xl dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Vægge: <strong>90–180 kr./m²</strong> (2 gange maling, inkl. materialer)</li>
              <li>• Lofter: <strong>110–200 kr./m²</strong></li>
              <li>• Timepris: <strong>425–625 kr./time</strong> inkl. moms</li>
              <li>• Helt hus (130 m²): <strong>35.000–65.000 kr.</strong></li>
            </ul>
          </div>

          <h2>Priser efter type</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground"><tr><th className="px-4 py-3 font-semibold">Opgave</th><th className="px-4 py-3 font-semibold">Pris (inkl. moms)</th><th className="px-4 py-3 font-semibold">Note</th></tr></thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">Vægmaling (standard)</td><td className="px-4 py-3">90–180 kr./m²</td><td className="px-4 py-3">2 lag</td></tr>
                <tr><td className="px-4 py-3">Loftmaling</td><td className="px-4 py-3">110–200 kr./m²</td><td className="px-4 py-3">Inkl. afdækning</td></tr>
                <tr><td className="px-4 py-3">Træværk (vindue/dør)</td><td className="px-4 py-3">450–900 kr./stk.</td><td className="px-4 py-3">Slibning + 2 lag</td></tr>
                <tr><td className="px-4 py-3">Udvendig facademaling</td><td className="px-4 py-3">180–320 kr./m²</td><td className="px-4 py-3">Inkl. stillads</td></tr>
                <tr><td className="px-4 py-3">Spartling før maling</td><td className="px-4 py-3">+30–60 kr./m²</td><td className="px-4 py-3">Ujævne vægge</td></tr>
              </tbody>
            </table>
          </div>

          <h2>5 faktorer der påvirker prisen</h2>
          <ol>
            <li><strong>Underlagets stand</strong> — gamle eller ujævne vægge kræver spartling.</li>
            <li><strong>Antal lag</strong> — kraftige farveskift kan kræve 3 lag og grunder.</li>
            <li><strong>Loftshøjde</strong> — over 2,5 m kræver stillads og længere tid.</li>
            <li><strong>Møblering</strong> — tomme rum males 25–40% hurtigere.</li>
            <li><strong>Malingens kvalitet</strong> — premium-maling fra fx Flügger koster 30–50% mere.</li>
          </ol>

          <h2>Eksempel: Lejlighed på 75 m²</h2>
          <p>
            En 75 m² lejlighed med <strong>vægge + lofter i alle rum</strong> tager typisk 5–7 dage
            for to malere og lander på <strong>22.000–36.000 kr.</strong> inkl. maling. Mens du er
            væk hjemmefra. Ekstra: træværk +6.000 kr., kraftig farveændring +15%.
          </p>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Få 3 gratis malertilbud</h2>
            <p className="mt-2 text-foreground/80">Sammenlign priser fra verificerede malere i dit område — gratis og uforpligtende.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to="/virksomheder?category=Maler" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se malere</Link>
            </div>
          </div>

          <h2>Ofte stillede spørgsmål</h2>
          <h3>Hvad koster en maler pr. m²?</h3>
          <p>Vægge: 90–180 kr./m². Lofter: 110–200 kr./m². Inkl. maling og 2 lag.</p>
          <h3>Hvad er timeprisen for en maler?</h3>
          <p>Typisk 425–625 kr. i timen inkl. moms.</p>
          <h3>Hvad koster det at male et helt hus indvendigt?</h3>
          <p>Et parcelhus på 130 m² koster typisk 35.000–65.000 kr. komplet indvendigt.</p>
        </article>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default PainterPriceGuide;