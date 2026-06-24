import { lazy, Suspense, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, MessageSquare, Building2, BookOpen, ArrowUpRight, Mail } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import ArticleFaqSection from "@/components/content/ArticleFaqSection";

const Footer = lazy(() => import("@/components/landing/Footer"));

interface HelpTopic {
  title: string;
  description: string;
  to: string;
  label: string;
  Icon: typeof Search;
}

const TOPICS: HelpTopic[] = [
  {
    title: "Find en serviceudbyder",
    description: "Søg blandt verificerede virksomheder eller filtrer efter kategori, by og pris.",
    to: "/virksomheder",
    label: "Gå til søgning",
    Icon: Search,
  },
  {
    title: "Indhent 3 tilbud",
    description: "Beskriv opgaven én gang og modtag uforpligtende tilbud fra op til 3 udbydere.",
    to: "/tilbud",
    label: "Start tilbudsrunde",
    Icon: MessageSquare,
  },
  {
    title: "Bliv udbyder",
    description: "Opret din virksomhedsside, modtag opgaver og kom på Serviceydere i dag.",
    to: "/opret-virksomhed",
    label: "Opret virksomhed",
    Icon: Building2,
  },
  {
    title: "Guides & priser",
    description: "Læs prisguides og find gennemsnitspriser for rengøring, flytning, håndværk og have.",
    to: "/guides",
    label: "Se guides",
    Icon: BookOpen,
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
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Genveje</p>
              <h2 id="topics" className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Populære emner</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {TOPICS.map((t, i) => (
              <Link
                key={t.to}
                to={t.to}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(var(--hero-cyan-bright) / 0.55), transparent)" }}
                />
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background ring-1 ring-foreground/10">
                    <t.Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} / {String(TOPICS.length).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{t.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                  {t.label} <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <ArticleFaqSection items={FAQ} title="Ofte stillede spørgsmål om Serviceydere" />

        <section
          aria-labelledby="kontakt"
          className="relative mt-14 overflow-hidden rounded-3xl text-background"
          style={{
            background:
              "radial-gradient(70% 120% at 100% 0%, hsl(var(--hero-cyan) / 0.45), transparent 60%), linear-gradient(135deg, hsl(var(--hero-bg)) 0%, hsl(204 80% 10%) 100%)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.1]"
            style={{
              backgroundImage: "radial-gradient(hsl(var(--hero-cyan-bright)) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative grid gap-6 p-8 sm:p-12 lg:grid-cols-[1.6fr,1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-background/70">Stadig i tvivl?</p>
              <h2 id="kontakt" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Kunne du ikke finde svar?
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-background/80">
                Skriv til os på{" "}
                <a href="mailto:kontakt@serviceydere.dk" className="font-semibold text-background underline underline-offset-2">
                  kontakt@serviceydere.dk
                </a>{" "}
                — vi svarer typisk samme hverdag.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <a
                href="mailto:kontakt@serviceydere.dk"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-background px-5 text-sm font-semibold text-foreground hover:opacity-90"
              >
                <Mail className="h-4 w-4" /> Skriv til support
              </a>
              <Link
                to="/tilbud"
                className="inline-flex h-11 items-center rounded-md border border-background/30 bg-background/5 px-5 text-sm font-semibold text-background hover:bg-background/10"
              >
                Få 3 gratis tilbud
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default HelpCenter;