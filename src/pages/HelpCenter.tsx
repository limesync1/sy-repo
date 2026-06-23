import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";

const Footer = lazy(() => import("@/components/landing/Footer"));

interface HelpTopic {
  title: string;
  description: string;
  to: string;
  label: string;
}

const TOPICS: HelpTopic[] = [
  {
    title: "Find en serviceudbyder",
    description: "Søg blandt verificerede virksomheder eller filtrer efter kategori, by og pris.",
    to: "/virksomheder",
    label: "Gå til søgning",
  },
  {
    title: "Indhent 3 tilbud",
    description: "Beskriv opgaven én gang og modtag uforpligtende tilbud fra op til 3 udbydere.",
    to: "/tilbud",
    label: "Start tilbudsrunde",
  },
  {
    title: "Bliv udbyder",
    description: "Opret din virksomhedsside, modtag opgaver og kom på Serviceydere i dag.",
    to: "/opret-virksomhed",
    label: "Opret virksomhed",
  },
  {
    title: "Guides & priser",
    description: "Læs prisguides og find gennemsnitspriser for rengøring, flytning, håndværk og have.",
    to: "/guides",
    label: "Se guides",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Hvad koster det at bruge Serviceydere som kunde?",
    a: "Det er 100 % gratis at søge efter udbydere og indhente op til 3 tilbud. Du betaler kun for selve opgaven til den udbyder du vælger.",
  },
  {
    q: "Hvordan ved jeg at en udbyder er pålidelig?",
    a: "Alle udbydere på Serviceydere er CVR-verificerede. På virksomhedssiden kan du se anmeldelser, oplyste forsikringer, åbningstider og typiske opgaver.",
  },
  {
    q: "Hvor hurtigt kan jeg forvente svar på en tilbudsforespørgsel?",
    a: "De fleste udbydere svarer inden for 24 timer på hverdage. Du modtager besked på email, så snart der kommer et tilbud.",
  },
  {
    q: "Kan jeg bruge BoligJob-fradraget på opgaver via Serviceydere?",
    a: "Ja — så længe opgaven er fradragsberettiget (rengøring, have, mindre håndværk osv.) og du betaler elektronisk. Læs vores BoligJob-guide for detaljer.",
  },
  {
    q: "Hvad gør jeg hvis jeg er utilfreds med en udbyder?",
    a: "Skriv først til udbyderen direkte. Hvis du ikke får løst sagen, kan du kontakte os på kontakt@serviceydere.dk — vi hjælper med at mægle og kan fjerne udbydere der ikke lever op til vores standarder.",
  },
  {
    q: "Hvordan opretter jeg min virksomhed på Serviceydere?",
    a: "Klik på “Bliv udbyder”, vælg dit abonnement og udfyld dit CVR-nummer. Du er online inden for få minutter og kan straks modtage opgaver.",
  },
  {
    q: "Hvilke abonnementer findes der for udbydere?",
    a: "Vi har et basisabonnement med plads til én by og kategori, samt et premiumabonnement med flere byer, flere kategorier, prioriteret placering og prisberegnere på din virksomhedsside.",
  },
  {
    q: "Kan jeg opsige mit abonnement når som helst?",
    a: "Ja. Du kan opsige løbende inde i dit virksomhedspanel — abonnementet løber til udgangen af den allerede betalte periode.",
  },
  {
    q: "Hvordan behandler I mine personoplysninger?",
    a: "Vi hoster al data i EU og følger GDPR. Læs detaljerne i vores privatlivspolitik.",
  },
];

const HelpCenter = () => {
  const location = useLocation();
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        // Lille delay så hero rendres først
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    }
  }, [location.hash]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Hjælpecenter & FAQ | Serviceydere"
        description="Få hjælp til at bruge Serviceydere som kunde eller udbyder. Svar på de oftest stillede spørgsmål om tilbud, abonnementer, BoligJob og support."
        canonicalPath="/hjaelp"
        keywords="serviceydere hjælp, faq serviceydere, support, kontakt serviceydere, ofte stillede spørgsmål"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[{ label: "Forside", to: "/" }, { label: "Hjælpecenter" }]}
        eyebrow="Support"
        title="Hjælpecenter"
        subtitle="Find svar på de oftest stillede spørgsmål, eller spring direkte til en af de mest brugte handlinger nedenfor."
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section aria-labelledby="topics" className="mb-14">
          <h2 id="topics" className="text-2xl font-bold tracking-tight text-foreground">Populære emner</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-sm"
              >
                <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
                <span className="mt-4 text-sm font-medium text-foreground group-hover:underline">{t.label} →</span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="faq" id="faq" className="mb-14 scroll-mt-24">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-foreground">Ofte stillede spørgsmål</h2>
          <p className="mt-2 text-muted-foreground">Klik på et spørgsmål for at se svaret.</p>
          <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {FAQ.map((f, i) => {
              const isOpen = open === i;
              return (
                <li key={f.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-foreground transition hover:bg-muted/40"
                  >
                    <span>{f.q}</span>
                    <span aria-hidden className={`text-xl text-muted-foreground transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm leading-6 text-muted-foreground">{f.a}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="kontakt" className="rounded-2xl border border-border bg-primary/5 p-6 sm:p-8">
          <h2 id="kontakt" className="text-2xl font-bold tracking-tight text-foreground">Kunne du ikke finde svar?</h2>
          <p className="mt-2 text-foreground/80">
            Skriv til os på <a href="mailto:kontakt@serviceydere.dk" className="font-semibold text-foreground underline underline-offset-2">kontakt@serviceydere.dk</a> — vi svarer typisk samme hverdag.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="mailto:kontakt@serviceydere.dk" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">
              Skriv til support
            </a>
            <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">
              Få 3 gratis tilbud
            </Link>
          </div>
        </section>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default HelpCenter;