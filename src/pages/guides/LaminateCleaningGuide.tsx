import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import { lazy, Suspense } from "react";

const Footer = lazy(() => import("@/components/landing/Footer"));

// SEO-målrettet guide: "rengøring af laminatgulv". Praktiske tips,
// rengøringsmidler, fejl der ødelægger gulvet, og interne links til
// /virksomheder?category=Rengøring + /tilbud.
const LaminateCleaningGuide = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Rengøring af laminatgulv: Sådan gør du det rigtigt",
      description:
        "Komplet guide til rengøring af laminatgulv — daglig pleje, de bedste rengøringsmidler, fejl der ødelægger gulvet, og hvornår du bør hyre en professionel.",
      datePublished: "2026-06-15",
      dateModified: "2026-06-15",
      author: { "@type": "Organization", name: "Serviceydere" },
      publisher: {
        "@type": "Organization",
        name: "Serviceydere",
        logo: { "@type": "ImageObject", url: "https://serviceydere.dk/serviceydere-logo-dark.webp" },
      },
      mainEntityOfPage: "https://serviceydere.dk/guides/rengoering-af-laminatgulv",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://serviceydere.dk/guides" },
        { "@type": "ListItem", position: 3, name: "Rengøring af laminatgulv", item: "https://serviceydere.dk/guides/rengoering-af-laminatgulv" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "Sådan rengør du et laminatgulv",
      step: [
        { "@type": "HowToStep", position: 1, name: "Støvsug eller fej", text: "Fjern sand, støv og småsten først — det er den hyppigste årsag til ridser i overfladen." },
        { "@type": "HowToStep", position: 2, name: "Vrid kluden hårdt op", text: "Brug en hårdt opvredet mikrofiberklud. Laminat tåler ikke stående vand." },
        { "@type": "HowToStep", position: 3, name: "Brug pH-neutralt middel", text: "Tilsæt en kapsel pH-neutralt laminatrens i lunkent vand. Undgå sæbespåner, eddike og ammoniak." },
        { "@type": "HowToStep", position: 4, name: "Tør i fibrenes retning", text: "Tør i samme retning som laminatbrædderne for at undgå striber." },
        { "@type": "HowToStep", position: 5, name: "Tør efter ved spild", text: "Tør straks væske op — vand der trænger ned i samlingerne får brædderne til at bule." },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Hvilket rengøringsmiddel er bedst til laminatgulv?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Brug et pH-neutralt laminatrens (fx Bona, Faxe eller producentens eget middel). Undgå sæbespåner, brun sæbe, eddike, ammoniak og slibende rens — de efterlader en hinde eller ødelægger overfladens lakering.",
          },
        },
        {
          "@type": "Question",
          name: "Må man vaske laminatgulv med vand?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ja, men kun med en hårdt opvredet klud. Stående vand er laminatgulvets værste fjende — det trænger ned i samlingerne mellem brædderne og får dem til at svulme op. Tør altid spild op med det samme.",
          },
        },
        {
          "@type": "Question",
          name: "Hvor ofte skal et laminatgulv vaskes?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Støvsug 2–3 gange om ugen og vask gulvet hver 1.–2. uge med pH-neutralt middel. I køkken og entré kan det være nødvendigt at vaske oftere pga. snavs og fugt.",
          },
        },
        {
          "@type": "Question",
          name: "Hvordan fjerner jeg striber på laminatgulvet?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Striber skyldes oftest sæberester eller for våd klud. Vask gulvet med rent lunkent vand uden middel, og tør efter med en tør mikrofiberklud i brædderetningen.",
          },
        },
        {
          "@type": "Question",
          name: "Kan en damprenser bruges på laminatgulv?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nej. Damprensere presser fugt og varme ned i samlingerne og kan permanent skade laminat. Brug i stedet en hårdt opvredet mikrofibermoppe.",
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Rengøring af laminatgulv: Den komplette guide 2026 | Serviceydere"
        description="Sådan rengør du laminatgulv uden at ødelægge det. Få de bedste rengøringsmidler, daglig pleje, typiske fejl og hvornår du bør hyre en professionel."
        canonicalPath="/guides/rengoering-af-laminatgulv"
        keywords="rengøring af laminatgulv, vaske laminatgulv, rens til laminatgulv, pleje af laminatgulv, laminat rengøring, rengøringsmiddel laminat"
        ogType="article"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[
          { label: "Forside", to: "/" },
          { label: "Guides", to: "/guides" },
          { label: "Rengøring af laminatgulv" },
        ]}
        eyebrow="Guide · Opdateret juni 2026"
        title="Rengøring af laminatgulv — sådan gør du det rigtigt"
        subtitle="Laminatgulv er nemt at vedligeholde, men tåler hverken stående vand eller stærke rengøringsmidler. Her er den komplette guide til daglig pleje, de rigtige midler og de fejl der koster gulvet levetid."
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="prose prose-neutral mx-auto max-w-3xl dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>• Støvsug <strong>før</strong> du vasker — sand giver ridser</li>
              <li>• Brug <strong>pH-neutralt</strong> laminatrens — aldrig sæbespåner eller eddike</li>
              <li>• Vask med <strong>hårdt opvredet</strong> mikrofiberklud — aldrig drivvådt</li>
              <li>• Tør spild op <strong>med det samme</strong></li>
              <li>• Damprenser og brun sæbe <strong>ødelægger</strong> laminat</li>
            </ul>
          </div>

          <h2>Sådan rengør du laminatgulvet trin-for-trin</h2>
          <ol>
            <li><strong>Støvsug eller fej grundigt.</strong> Småsten og sand er hovedårsagen til ridser. Brug et blødt mundstykke eller en mikrofibermoppe.</li>
            <li><strong>Bland pH-neutralt middel i lunkent vand.</strong> Følg doseringen — for meget middel efterlader striber.</li>
            <li><strong>Vrid kluden hårdt op.</strong> Den må kun være let fugtig. Stående vand er gift for laminat.</li>
            <li><strong>Tør i brædderetningen.</strong> Det giver et stribefrit resultat og fanger snavset bedre.</li>
            <li><strong>Tør efter med en tør klud</strong> hvis du kan se vandfilm — laminatet skal være tørt inden for 1–2 minutter.</li>
          </ol>

          <h2>De bedste rengøringsmidler til laminat</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Middel</th>
                  <th className="px-4 py-3 font-semibold">Anbefales?</th>
                  <th className="px-4 py-3 font-semibold">Hvorfor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3">pH-neutralt laminatrens (Bona, Faxe)</td><td className="px-4 py-3 text-emerald-600">Ja</td><td className="px-4 py-3">Skånsomt og stribefrit</td></tr>
                <tr><td className="px-4 py-3">Mikrofiberspray (universal)</td><td className="px-4 py-3 text-emerald-600">Ja</td><td className="px-4 py-3">Minimal vandmængde</td></tr>
                <tr><td className="px-4 py-3">Sæbespåner / brun sæbe</td><td className="px-4 py-3 text-red-600">Nej</td><td className="px-4 py-3">Efterlader fedtet hinde</td></tr>
                <tr><td className="px-4 py-3">Eddike / citronsyre</td><td className="px-4 py-3 text-red-600">Nej</td><td className="px-4 py-3">Nedbryder lakeringen</td></tr>
                <tr><td className="px-4 py-3">Ammoniak / klorin</td><td className="px-4 py-3 text-red-600">Nej</td><td className="px-4 py-3">Misfarver overfladen</td></tr>
                <tr><td className="px-4 py-3">Damprenser</td><td className="px-4 py-3 text-red-600">Nej</td><td className="px-4 py-3">Fugt trænger i samlingerne</td></tr>
              </tbody>
            </table>
          </div>

          <h2>5 typiske fejl der ødelægger laminatgulvet</h2>
          <ol>
            <li><strong>For meget vand</strong> — brædderne bulker op ved samlingerne og kan ikke rettes igen.</li>
            <li><strong>Sæbespåner</strong> — efterlader en klistret hinde som tiltrækker mere snavs.</li>
            <li><strong>At springe støvsugningen over</strong> — sand under moppen giver mikroskopiske ridser i lakken.</li>
            <li><strong>Slibende svampe</strong> — ridser overfladen permanent. Brug altid blød mikrofiber.</li>
            <li><strong>Damprensere</strong> — varmen og fugten ødelægger limen i HDF-kernen.</li>
          </ol>

          <h2>Daglig og ugentlig pleje</h2>
          <ul>
            <li><strong>Dagligt:</strong> Tør spild op med det samme. Brug filtdupper under stole og bordben.</li>
            <li><strong>2–3 gange om ugen:</strong> Støvsug eller fej for sand og støv.</li>
            <li><strong>Hver 1.–2. uge:</strong> Vask med pH-neutralt middel.</li>
            <li><strong>2 gange om året:</strong> Tjek samlinger og fugelister for fugtskader.</li>
          </ul>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Skal du have hjælp til rengøringen?</h2>
            <p className="mt-2 text-foreground/80">
              Hyr et professionelt rengøringsfirma der ved hvordan laminatgulve plejes korrekt —
              eller få op til 3 gratis tilbud på fast rengøring i din bolig.
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
            <p className="mt-4 text-sm text-muted-foreground">
              Læs også: <Link to="/priser/rengoering" className="underline">Hvad koster rengøring i 2026?</Link>
            </p>
          </div>

          <h2>Ofte stillede spørgsmål</h2>

          <h3>Hvilket rengøringsmiddel er bedst til laminatgulv?</h3>
          <p>Et pH-neutralt laminatrens (fx Bona eller Faxe). Undgå sæbespåner, eddike, ammoniak og slibende midler — de ødelægger lakeringen eller efterlader en hinde.</p>

          <h3>Må man vaske laminatgulv med vand?</h3>
          <p>Ja, men kun med en hårdt opvredet klud. Stående vand trænger ned i samlingerne og får brædderne til at bulke op.</p>

          <h3>Hvor ofte skal et laminatgulv vaskes?</h3>
          <p>Støvsug 2–3 gange om ugen og vask gulvet hver 1.–2. uge med pH-neutralt middel. I køkken og entré oftere.</p>

          <h3>Kan en damprenser bruges på laminatgulv?</h3>
          <p>Nej. Damp og fugt ødelægger samlingerne. Brug en hårdt opvredet mikrofibermoppe i stedet.</p>
        </article>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default LaminateCleaningGuide;