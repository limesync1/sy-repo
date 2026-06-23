import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import { lazy, Suspense } from "react";

const Footer = lazy(() => import("@/components/landing/Footer"));

// SEO-målrettet prisguide: "rengøringsfirma priser" (1.900/md) +
// "hvad koster privat rengøring" (720/md). Indeholder pris-tabeller,
// faktorer, FAQ, og interne links til /virksomheder?category=Rengøring
// og /tilbud, så besøgende konverterer videre i flowet.
const CleaningPriceGuide = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Prisguide: Hvad koster rengøringshjælp i 2026?",
      description:
        "Komplet guide til priser på privat- og erhvervsrengøring i Danmark. Timepris, fast pris, faktorer der påvirker prisen og typiske eksempler.",
      datePublished: "2026-06-15",
      dateModified: "2026-06-15",
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: {
        "@type": "Organization",
        name: "Serviceydere",
        logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" },
      },
      mainEntityOfPage: "https://serviceydere.dk/priser/rengoering",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Prisguides", item: "https://serviceydere.dk/priser" },
        { "@type": "ListItem", position: 3, name: "Rengøring", item: "https://serviceydere.dk/priser/rengoering" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Hvad koster privat rengøring pr. time i 2026?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Privat rengøring i Danmark koster typisk 250–450 kr. i timen inkl. moms. Prisen afhænger af om du bruger en BoligJob-godkendt virksomhed (giver fradrag), om der er fast aftale eller engangsopgave, og hvor i landet du bor.",
          },
        },
        {
          "@type": "Question",
          name: "Hvad koster fast rengøring i en lejlighed?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Fast rengøring i en lejlighed på 60–90 m² koster typisk 350–650 kr. pr. besøg ved rengøring hver 2. uge. Større boliger og ugentlig frekvens giver lavere timepris.",
          },
        },
        {
          "@type": "Question",
          name: "Hvad er forskellen på timepris og fast pris?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Timepris betales pr. faktisk anvendt time og passer til opgaver hvor omfanget er svært at vurdere. Fast pris er et samlet beløb for en defineret opgave (fx flytterengøring) og giver budgetsikkerhed.",
          },
        },
        {
          "@type": "Question",
          name: "Kan jeg få fradrag for rengøring?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ja. Med BoligJobordningen (servicefradrag) kan du i 2026 trække op til 12.300 kr. fra pr. person for serviceydelser i hjemmet — herunder rengøring. Virksomheden skal være momsregistreret og du skal betale digitalt.",
          },
        },
        {
          "@type": "Question",
          name: "Hvad koster erhvervsrengøring?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Erhvervsrengøring afregnes typisk 8–18 kr. pr. m² pr. måned ved fast aftale, eller 220–380 kr. pr. time ekskl. moms ved engangs- eller hovedrengøring. Aftaler over 1.000 m² eller flere ugentlige besøg ligger i den lave ende.",
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Prisguide: Hvad koster rengøring i 2026? | Serviceydere"
        description="Hvad koster rengøringshjælp i Danmark? Se timepriser, faste priser, BoligJob-fradrag og hvad der påvirker prisen for privat- og erhvervsrengøring."
        canonicalPath="/priser/rengoering"
        keywords="rengøringsfirma priser, hvad koster privat rengøring, rengøring pris, timepris rengøring, fast pris rengøring, erhvervsrengøring pris, boligjob fradrag rengøring"
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Prisguides", to: "/guides" },
          { label: "Rengøring" },
        ]}
        eyebrow="Prisguide · Opdateret juni 2026"
        title="Hvad koster rengøring i 2026?"
        subtitle="En komplet guide til priser på privat- og erhvervsrengøring i Danmark — timepris, fast pris, BoligJob-fradrag og hvad der reelt påvirker prisen."
      />

      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="prose prose-neutral max-w-none dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Privat rengøring: <strong>250–450 kr./time</strong> inkl. moms</li>
              <li>• Fast rengøring i lejlighed (60–90 m²): <strong>350–650 kr./besøg</strong></li>
              <li>• Erhvervsrengøring: <strong>8–18 kr./m²/md.</strong> ved fast aftale</li>
              <li>• BoligJob-fradrag i 2026: op til <strong>12.300 kr./person</strong></li>
            </ul>
          </div>

          <h2>Timepris vs. fast pris</h2>
          <p>
            De fleste rengøringsfirmaer tilbyder to prismodeller. Timepris egner sig til opgaver
            hvor omfanget er svært at vurdere på forhånd — fx hovedrengøring efter en flytning eller
            en uvant rengøring af et sommerhus. Fast pris giver til gengæld budgetsikkerhed når
            opgaven er klart defineret (fx rengøring hver 2. uge i en kendt lejlighed).
          </p>

          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Type rengøring</th>
                  <th className="px-4 py-3 font-semibold">Typisk pris</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">Fast privatrengøring</td>
                  <td className="px-4 py-3">250–350 kr./time</td>
                  <td className="px-4 py-3">Timepris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Engangs hovedrengøring</td>
                  <td className="px-4 py-3">350–450 kr./time</td>
                  <td className="px-4 py-3">Timepris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Flytterengøring (lejlighed)</td>
                  <td className="px-4 py-3">1.500–4.500 kr.</td>
                  <td className="px-4 py-3">Fast pris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Vinduespudsning (villa)</td>
                  <td className="px-4 py-3">400–900 kr./besøg</td>
                  <td className="px-4 py-3">Fast pris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Erhvervsrengøring (kontor)</td>
                  <td className="px-4 py-3">8–18 kr./m²/md.</td>
                  <td className="px-4 py-3">Fast pris</td>
                </tr>
              </tbody>
            </table>
            <p className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              Vejledende priser inkl. moms for privat. Erhvervspriser ekskl. moms.
            </p>
          </div>

          <h2>5 faktorer der påvirker prisen</h2>
          <ol>
            <li>
              <strong>Boligens størrelse</strong> — Større areal = flere timer. En 120 m² villa tager
              typisk 2,5–3,5 timer, en 70 m² lejlighed 1,5–2 timer.
            </li>
            <li>
              <strong>Frekvens</strong> — Ugentlig rengøring koster mindre pr. time end engangsbesøg,
              fordi der ikke ophobes snavs mellem besøgene.
            </li>
            <li>
              <strong>Geografi</strong> — København og Aarhus ligger 10–20% over landsgennemsnit.
              Yderkommuner er typisk billigst.
            </li>
            <li>
              <strong>BoligJob-godkendelse</strong> — En godkendt virksomhed giver dig fradrag, men
              kan ligge lidt højere i timepris (de skal være momsregistreret).
            </li>
            <li>
              <strong>Ekstra ydelser</strong> — Strygning, vinduespudsning indvendigt, ovn- og
              køleskabsrengøring afregnes ofte separat.
            </li>
          </ol>

          <h2>BoligJob-fradrag i 2026</h2>
          <p>
            Du kan trække op til <strong>12.300 kr. pr. voksen</strong> i husstanden fra for
            serviceydelser i hjemmet — rengøring, vinduespudsning, havearbejde og børnepasning.
            Krav: virksomheden er momsregistreret, du betaler digitalt (MobilePay, bankoverførsel,
            betalingskort), og arbejdet udføres i din bolig.
          </p>

          <h2>Eksempel: Fast rengøring i en lejlighed</h2>
          <p>
            En typisk 75 m² lejlighed med to voksne og rengøring hver 14. dag tager omkring 2 timer.
            Med en timepris på 295 kr. lander du på <strong>590 kr. pr. besøg</strong> eller cirka{" "}
            <strong>1.275 kr./md.</strong> Med BoligJob-fradrag falder den reelle udgift til omkring{" "}
            <strong>820 kr./md.</strong> efter skat.
          </p>

          <h2>Sådan får du den bedste pris</h2>
          <ul>
            <li>Indhent <strong>3 tilbud</strong> så du kan sammenligne timepris og inkluderede ydelser.</li>
            <li>Vælg <strong>fast aftale</strong> fremfor engangsbesøg, hvis du har et fast behov.</li>
            <li>Tjek at firmaet er <strong>momsregistreret</strong> og kan udstede faktura med CVR.</li>
            <li>Læs <strong>anmeldelser</strong> og bed om referencer fra lignende boliger.</li>
          </ul>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Klar til at få tilbud?</h2>
            <p className="mt-2 text-foreground/80">
              Få op til 3 gratis, uforpligtende tilbud fra verificerede rengøringsfirmaer i dit
              område — eller find og book direkte.
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
                Se rengøringsfirmaer
              </Link>
            </div>
          </div>

          <h2>Ofte stillede spørgsmål</h2>

          <h3>Hvad koster privat rengøring pr. time?</h3>
          <p>
            Typisk 250–450 kr. i timen inkl. moms. Faste aftaler ligger i den lave ende, engangs- og
            hovedrengøring i den høje.
          </p>

          <h3>Hvad koster fast rengøring i en lejlighed?</h3>
          <p>
            En lejlighed på 60–90 m² koster typisk 350–650 kr. pr. besøg ved rengøring hver 2. uge.
          </p>

          <h3>Hvad er forskellen på timepris og fast pris?</h3>
          <p>
            Timepris betales pr. faktisk anvendt time. Fast pris er et samlet beløb for en defineret
            opgave — fx flytterengøring eller en månedlig aftale.
          </p>

          <h3>Kan jeg få fradrag for rengøring?</h3>
          <p>
            Ja. Med BoligJobordningen kan du i 2026 trække op til 12.300 kr. fra pr. person, hvis
            firmaet er momsregistreret og du betaler digitalt.
          </p>

          <h3>Hvad koster erhvervsrengøring?</h3>
          <p>
            Erhvervsrengøring afregnes typisk 8–18 kr. pr. m² pr. måned ved fast aftale, eller
            220–380 kr. pr. time ekskl. moms ved engangsopgaver.
          </p>
        </article>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default CleaningPriceGuide;