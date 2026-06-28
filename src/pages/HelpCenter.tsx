import { lazy, Suspense, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, MessageSquare, Building2, BookOpen, ArrowUpRight, Mail } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";

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
    a: "Alle udbydere er CVR-verificerede, før de kan oprette en profil. På virksomhedssiden kan du se kontaktoplysninger, åbningstider, typiske opgaver og — hvis udbyderen har oplyst det — forsikring og certificeringer.",
  },
  {
    q: "Hvor hurtigt kan jeg forvente svar på en tilbudsforespørgsel?",
    a: "Det afhænger af udbyder og opgavetype, men de fleste forespørgsler bliver besvaret inden for et par hverdage. Du får besked på e-mail, så snart der kommer et tilbud.",
  },
  {
    q: "Kan jeg bruge BoligJob-fradraget på opgaver via Serviceydere?",
    a: "Serviceydere er en formidlingsplatform — selve fradraget aftaler og indberetter du direkte med den udbyder, du vælger. Om en opgave er fradragsberettiget afhænger af opgavetype og de aktuelle SKAT-regler. Læs vores guide om servicefradraget for et opdateret overblik.",
  },
  {
    q: "Hvad gør jeg hvis jeg er utilfreds med en udbyder?",
    a: "Kontakt først udbyderen direkte — aftalen er indgået mellem jer. Får I ikke løst sagen, må du gerne skrive til os på kontakt@serviceydere.dk. Vi kan ikke afgøre tvister, men vi følger op, og udbydere der gentagne gange får velbegrundede klager, kan miste deres profil.",
  },
  {
    q: "Hvordan opretter jeg min virksomhed på Serviceydere?",
    a: "Klik på “Bliv udbyder”, indtast dit CVR-nummer (vi henter automatisk dine grunddata), vælg de funktioner du har brug for, og du kan være online på få minutter.",
  },
  {
    q: "Hvad koster det at være udbyder?",
    a: "Prisen er modulopbygget: en fast basispris pr. måned plus tilkøb af de funktioner du har brug for — fx flere byer/kategorier, prisberegnere, ruteplanlægger eller medarbejderlogins. Du kan se din samlede pris live, mens du opretter virksomheden.",
  },
  {
    q: "Kan jeg opsige mit abonnement når som helst?",
    a: "Ja. Du kan opsige løbende inde i dit virksomhedspanel, og abonnementet løber til udgangen af den allerede betalte periode.",
  },
  {
    q: "Hvordan behandler I mine personoplysninger?",
    a: "Vi følger GDPR og hoster data i EU. Læs detaljerne i vores privatlivspolitik.",
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

      {/* HERO — editorial dark */}
      <section className="relative overflow-hidden bg-[hsl(var(--hero-bg))] text-background">
        <div aria-hidden className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[hsl(var(--accent)/0.18)] to-transparent" />
        <div aria-hidden className="absolute left-0 top-0 h-[2px] w-32 bg-[hsl(var(--accent))]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <nav aria-label="Brødkrumme" className="mb-10 text-xs font-medium text-background/55">
            <Link to="/" className="hover:text-background">Forside</Link>
            <span className="mx-2 text-background/30">/</span>
            <span className="text-background/80">Hjælpecenter</span>
          </nav>
          <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
            Support
          </span>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Hjælpecenter.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-background/75">
            Find svar på de oftest stillede spørgsmål, eller spring direkte til en af de mest brugte handlinger nedenfor.
          </p>
        </div>
      </section>

      <main id="main">
        {/* TOPICS — hairline grid */}
        <section aria-labelledby="topics" className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                  Genveje
                </span>
                <h2 id="topics" className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                  Populære emner
                </h2>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Fire indgange dækker langt de fleste henvendelser fra både kunder og udbydere.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
              {TOPICS.map((t, i) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className="group flex flex-col bg-card p-8 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center bg-foreground text-background">
                      <t.Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs text-[hsl(var(--accent))]">
                      {String(i + 1).padStart(2, "0")} / {String(TOPICS.length).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold tracking-tight text-foreground">{t.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.description}</p>
                  <span className="mt-6 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground">
                    {t.label} <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ — editorial divide-y */}
        <section id="faq" className="scroll-mt-24 border-y border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                  FAQ
                </span>
                <h2 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                  Ofte stillede spørgsmål
                </h2>
              </div>
              <p className="text-base leading-7 text-muted-foreground lg:pt-2">
                Korte, ærlige svar på det vi oftest bliver spurgt om — fra første tilbudsforespørgsel
                til opsigelse af et udbyder-abonnement.
              </p>
            </div>
            <div className="divide-y divide-border border-y border-border bg-background">
              {FAQ.map((item) => (
                <details key={item.q} className="group px-5 py-5 sm:px-7 sm:py-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-8 text-left">
                    <span className="text-base font-bold tracking-tight text-foreground sm:text-lg">{item.q}</span>
                    <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center text-[hsl(var(--accent))] transition-transform group-open:rotate-45">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </span>
                  </summary>
                  <div className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — outlined dark */}
        <section className="bg-background py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden bg-[hsl(var(--hero-bg))] p-10 text-background sm:p-14">
              <div aria-hidden className="absolute left-0 top-0 h-[2px] w-32 bg-[hsl(var(--accent))]" />
              <div className="flex flex-col items-start justify-between gap-8 border border-background/10 p-8 sm:p-10 lg:flex-row lg:items-center">
                <div className="max-w-xl">
                  <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                    Stadig i tvivl?
                  </span>
                  <h2 id="kontakt" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                    Kunne du ikke finde svar?
                  </h2>
                  <p className="mt-3 max-w-xl text-base text-background/75">
                    Skriv til os på{" "}
                    <a href="mailto:kontakt@serviceydere.dk" className="font-semibold text-background underline underline-offset-4">
                      kontakt@serviceydere.dk
                    </a>{" "}
                    — vi vender retur så hurtigt vi kan på hverdage.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href="mailto:kontakt@serviceydere.dk"
                    className="inline-flex items-center justify-center gap-2 bg-[hsl(var(--accent))] px-7 py-4 text-sm font-bold uppercase tracking-wider text-[hsl(var(--hero-bg))] hover:opacity-90"
                  >
                    <Mail className="h-4 w-4" /> Skriv til support
                  </a>
                  <Link
                    to="/tilbud"
                    className="inline-flex items-center justify-center border border-background/25 px-7 py-4 text-sm font-bold uppercase tracking-wider text-background hover:bg-background/5"
                  >
                    Få 3 gratis tilbud
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default HelpCenter;