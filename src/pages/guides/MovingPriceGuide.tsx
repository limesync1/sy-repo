import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import ArticleFaqSection from "@/components/content/ArticleFaqSection";
import { lazy, Suspense } from "react";

const Footer = lazy(() => import("@/components/landing/Footer"));

// SEO-målrettet prisguide: "flyttefirma priser" + "hvad koster flyttehjælp".
// Indeholder pris-tabeller, faktorer, FAQ, og interne links til
// /virksomheder?category=Flyttehjælp og /tilbud.
const MovingPriceGuide = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Prisguide: Hvad koster flyttehjælp i 2026?",
      description:
        "Komplet guide til priser på flyttehjælp i Danmark. Timepris, fast pris, hvad der påvirker prisen og typiske eksempler ved flytning af lejlighed eller villa.",
      datePublished: "2026-06-15",
      dateModified: "2026-06-15",
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: {
        "@type": "Organization",
        name: "Serviceydere",
        logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" },
      },
      mainEntityOfPage: "https://serviceydere.dk/priser/flyttehjaelp",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Prisguides", item: "https://serviceydere.dk/priser" },
        { "@type": "ListItem", position: 3, name: "Flyttehjælp", item: "https://serviceydere.dk/priser/flyttehjaelp" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Hvad koster flyttehjælp pr. time i 2026?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Flyttehjælp i Danmark koster typisk 450–900 kr. i timen inkl. moms for to mand og en flyttebil. Prisen afhænger af bytransport, antal etager, elevator og om der skal pakkes.",
          },
        },
        {
          "@type": "Question",
          name: "Hvad koster en flytning af en lejlighed?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "En 2-værelses lejlighed koster typisk 3.500–6.500 kr. for en lokal flytning. En 4-værelses villa ligger ofte mellem 8.000–15.000 kr. afhængigt af afstand og mængde indbo.",
          },
        },
        {
          "@type": "Question",
          name: "Timepris eller fast pris til flytning?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Timepris er bedst til mindre, simple flytninger hvor du selv pakker og holder tempoet. Fast pris giver budgetsikkerhed og er typisk bedst ved hele bohaver, lange afstande eller når der skal pakkes og bæres ekstra meget.",
          },
        },
        {
          "@type": "Question",
          name: "Er der fradrag på flyttehjælp?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nej. BoligJob-fradraget dækker rengøring, havearbejde og børnepasning — men ikke selve flytningen. Flytterengøring efter fraflytning er dog fradragsberettiget.",
          },
        },
        {
          "@type": "Question",
          name: "Hvad påvirker prisen mest?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Afstanden mellem boligerne, mængden af indbo (m³), antallet af etager uden elevator, om der skal pakkes/udpakkes, samt eventuelle tunge ting som klaver eller boksspring.",
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Prisguide: Hvad koster flyttehjælp i 2026? | Serviceydere"
        description="Hvad koster flyttehjælp i Danmark? Se timepriser, faste priser, hvad der påvirker prisen og typiske eksempler for lejlighed og villa."
        canonicalPath="/priser/flyttehjaelp"
        keywords="flyttefirma priser, hvad koster flyttehjælp, flytning pris, timepris flytning, fast pris flytning, flyttemand pris, billig flyttehjælp"
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Prisguides", to: "/guides" },
          { label: "Flyttehjælp" },
        ]}
        eyebrow="Prisguide · Opdateret juni 2026"
        title="Hvad koster flyttehjælp i 2026?"
        subtitle="En komplet guide til priser på flyttehjælp i Danmark — timepris, fast pris og hvad der reelt påvirker regningen, uanset om du flytter lejlighed eller hele villaen."
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="article-content prose prose-neutral dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Timepris (2 mand + bil): <strong>450–900 kr./time</strong> inkl. moms</li>
              <li>• 2-værelses lejlighed: <strong>3.500–6.500 kr.</strong></li>
              <li>• 4-værelses villa: <strong>8.000–15.000 kr.</strong></li>
              <li>• Pakkehjælp: <strong>+500–1.500 kr.</strong> afhængigt af mængde</li>
            </ul>
          </div>

          <h2>Timepris vs. fast pris</h2>
          <p>
            Timepris passer til mindre flytninger hvor du selv pakker og kender omfanget — fx en
            lejlighed med få møbler og kort afstand. Fast pris giver budgetsikkerhed når flytningen
            er stor, kompleks eller går over længere afstand. De fleste flyttefirmaer giver gerne et
            fast tilbud efter et kort besøg eller en videogennemgang.
          </p>

          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Type flytning</th>
                  <th className="px-4 py-3 font-semibold">Typisk pris</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">1-værelses lejlighed</td>
                  <td className="px-4 py-3">2.000–3.500 kr.</td>
                  <td className="px-4 py-3">Fast pris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">2-værelses lejlighed</td>
                  <td className="px-4 py-3">3.500–6.500 kr.</td>
                  <td className="px-4 py-3">Fast pris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">3-værelses lejlighed</td>
                  <td className="px-4 py-3">5.500–9.500 kr.</td>
                  <td className="px-4 py-3">Fast pris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Villa (140–180 m²)</td>
                  <td className="px-4 py-3">8.000–15.000 kr.</td>
                  <td className="px-4 py-3">Fast pris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">2 mand + bil (timepris)</td>
                  <td className="px-4 py-3">450–900 kr./time</td>
                  <td className="px-4 py-3">Timepris</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Klaver / boksspring (tillæg)</td>
                  <td className="px-4 py-3">500–2.500 kr.</td>
                  <td className="px-4 py-3">Fast pris</td>
                </tr>
              </tbody>
            </table>
            <p className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              Vejledende priser inkl. moms for lokal flytning i samme by.
            </p>
          </div>

          <h2>6 faktorer der påvirker prisen</h2>
          <ol>
            <li>
              <strong>Mængden af indbo (m³)</strong> — Jo mere du flytter, jo større bil og flere
              timer. Et godt overslag: 2-værelses ≈ 15 m³, villa ≈ 35–50 m³.
            </li>
            <li>
              <strong>Afstand</strong> — Lokale flytninger er billigst. Over 100 km tillægges
              kørsel typisk med 8–12 kr./km.
            </li>
            <li>
              <strong>Etager og elevator</strong> — Hver etage uden elevator giver tillæg (typisk
              250–600 kr./etage).
            </li>
            <li>
              <strong>Pakning</strong> — Vil du have firmaet til at pakke? Det koster ekstra, men
              sparer dig dage af arbejde.
            </li>
            <li>
              <strong>Tidspunkt</strong> — Weekender, månedsskifte og sommerferie er dyrere end
              hverdage midt i måneden.
            </li>
            <li>
              <strong>Forsikring</strong> — Tjek altid om firmaets transportforsikring dækker
              skader på dit indbo — det bør være standard, men ikke alle har det.
            </li>
          </ol>

          <h2>Eksempel: Flytning af 2-værelses lejlighed</h2>
          <p>
            En 2-værelses lejlighed på 55 m² i samme by med 2. sals adgang uden elevator tager
            typisk 4–5 timer for 2 mand + bil. Med en timepris på 750 kr. lander du på{" "}
            <strong>3.000–3.750 kr.</strong> Vælger du fast pris med pakkehjælp, ender du tættere på{" "}
            <strong>5.500–6.500 kr.</strong>
          </p>

          <h2>Sådan får du den bedste pris</h2>
          <ul>
            <li>Indhent <strong>3 tilbud</strong> — priserne svinger meget mellem firmaer.</li>
            <li>Send <strong>billeder eller video</strong> så firmaet kan give et præcist fast tilbud.</li>
            <li>Flyt på en <strong>hverdag midt i måneden</strong> hvis du kan — det er billigst.</li>
            <li>Tjek <strong>anmeldelser</strong> og at firmaet har CVR + transportforsikring.</li>
            <li>Husk <strong>flytterengøring</strong> — den er fradragsberettiget via BoligJob.</li>
          </ul>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Klar til at få tilbud?</h2>
            <p className="mt-2 text-foreground/80">
              Få op til 3 gratis, uforpligtende tilbud fra verificerede flyttefirmaer i dit
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
                to="/virksomheder?category=Flyttehj%C3%A6lp"
                className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Se flyttefirmaer
              </Link>
            </div>
          </div>

          <ArticleFaqSection
            items={[
              { q: "Hvad koster flyttehjælp pr. time?", a: "Typisk 450–900 kr. i timen inkl. moms for 2 mand + flyttebil. Hovedstadsområdet ligger i den høje ende." },
              { q: "Hvad koster en flytning af en lejlighed?", a: "En 2-værelses lejlighed koster typisk 3.500–6.500 kr. for en lokal flytning, alt efter mængde og etager." },
              { q: "Timepris eller fast pris?", a: "Fast pris er bedst hvis omfanget er kendt og du vil have budgetsikkerhed. Timepris kan betale sig ved små, hurtige flytninger." },
              { q: "Er der fradrag på flyttehjælp?", a: "Nej, ikke på selve flytningen. Men flytterengøring efter fraflytning er fradragsberettiget via BoligJobordningen." },
              { q: "Hvor langt i forvejen skal jeg booke?", a: "2–4 uger er typisk nok. Ved månedsskifte (sidste fredag/lørdag) bør du booke 4–6 uger i forvejen." },
            ]}
          />
        </article>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default MovingPriceGuide;