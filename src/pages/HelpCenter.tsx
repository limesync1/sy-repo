import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, MessageSquare, Building2, BookOpen, ArrowRight, Mail, Plus, X } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/landing/PageHero";
import SmartLink from "@/components/SmartLink";

const Footer = lazy(() => import("@/components/landing/Footer"));

type FaqCategory = "Kunder" | "Udbydere" | "Betaling" | "Privatliv";

interface HelpTopic {
  title: string;
  description: string;
  to: string;
  label: string;
  Icon: typeof Search;
  tone: string;
}

const TOPICS: HelpTopic[] = [
  {
    title: "Find en serviceudbyder",
    description: "Søg blandt verificerede virksomheder eller filtrer efter kategori, by og pris.",
    to: "/virksomheder",
    label: "Gå til søgning",
    Icon: Search,
    tone: "bg-feature-cool text-feature-cool-foreground",
  },
  {
    title: "Indhent 3 tilbud",
    description: "Beskriv opgaven én gang og modtag uforpligtende tilbud fra op til 3 udbydere.",
    to: "/tilbud",
    label: "Start tilbudsrunde",
    Icon: MessageSquare,
    tone: "bg-feature-warm text-feature-warm-foreground",
  },
  {
    title: "Bliv udbyder",
    description: "Opret din virksomhedsside, modtag opgaver og kom på Serviceydere i dag.",
    to: "/opret-virksomhed",
    label: "Opret virksomhed",
    Icon: Building2,
    tone: "bg-feature-lilac text-feature-lilac-foreground",
  },
  {
    title: "Guides & priser",
    description: "Læs prisguides og find gennemsnitspriser for rengøring, flytning, håndværk og have.",
    to: "/guides",
    label: "Se guides",
    Icon: BookOpen,
    tone: "bg-accent-soft text-accent",
  },
];

const FAQ: { q: string; a: string; cat: FaqCategory }[] = [
  {
    cat: "Kunder",
    q: "Hvad koster det at bruge Serviceydere som kunde?",
    a: "Det er 100 % gratis at søge efter udbydere og indhente op til 3 tilbud. Du betaler kun for selve opgaven til den udbyder du vælger.",
  },
  {
    cat: "Kunder",
    q: "Hvordan ved jeg at en udbyder er pålidelig?",
    a: "Alle udbydere er CVR-verificerede, før de kan oprette en profil. På virksomhedssiden kan du se kontaktoplysninger, åbningstider, typiske opgaver og — hvis udbyderen har oplyst det — forsikring og certificeringer.",
  },
  {
    cat: "Kunder",
    q: "Hvor hurtigt kan jeg forvente svar på en tilbudsforespørgsel?",
    a: "Det afhænger af udbyder og opgavetype, men de fleste forespørgsler bliver besvaret inden for et par hverdage. Du får besked på e-mail, så snart der kommer et tilbud.",
  },
  {
    cat: "Betaling",
    q: "Kan jeg bruge BoligJob-fradraget på opgaver via Serviceydere?",
    a: "Serviceydere er en formidlingsplatform — selve fradraget aftaler og indberetter du direkte med den udbyder, du vælger. Om en opgave er fradragsberettiget afhænger af opgavetype og de aktuelle SKAT-regler. Læs vores guide om servicefradraget for et opdateret overblik.",
  },
  {
    cat: "Kunder",
    q: "Hvad gør jeg hvis jeg er utilfreds med en udbyder?",
    a: "Kontakt først udbyderen direkte — aftalen er indgået mellem jer. Får I ikke løst sagen, må du gerne skrive til os på kontakt@serviceydere.dk. Vi kan ikke afgøre tvister, men vi følger op, og udbydere der gentagne gange får velbegrundede klager, kan miste deres profil.",
  },
  {
    cat: "Udbydere",
    q: "Hvordan opretter jeg min virksomhed på Serviceydere?",
    a: "Klik på “Bliv udbyder”, indtast dit CVR-nummer (vi henter automatisk dine grunddata), vælg de funktioner du har brug for, og du kan være online på få minutter.",
  },
  {
    cat: "Udbydere",
    q: "Hvad koster det at være udbyder?",
    a: "Prisen er modulopbygget: en fast basispris pr. måned plus tilkøb af de funktioner du har brug for — fx flere byer/kategorier, prisberegnere, ruteplanlægger eller medarbejderlogins. Du kan se din samlede pris live, mens du opretter virksomheden.",
  },
  {
    cat: "Betaling",
    q: "Kan jeg opsige mit abonnement når som helst?",
    a: "Ja. Du kan opsige løbende inde i dit virksomhedspanel, og abonnementet løber til udgangen af den allerede betalte periode.",
  },
  {
    cat: "Privatliv",
    q: "Hvordan behandler I mine personoplysninger?",
    a: "Vi følger GDPR og hoster data i EU. Læs detaljerne i vores privatlivspolitik.",
  },
];

const CATEGORIES: { key: FaqCategory | "Alle"; label: string }[] = [
  { key: "Alle", label: "Alle" },
  { key: "Kunder", label: "Kunder" },
  { key: "Udbydere", label: "Udbydere" },
  { key: "Betaling", label: "Betaling" },
  { key: "Privatliv", label: "Privatliv" },
];

const HelpCenter = () => {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<FaqCategory | "Alle">("Alle");

  const filteredFaq = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ.filter((item) => {
      if (activeCat !== "Alle" && item.cat !== activeCat) return false;
      if (!q) return true;
      return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
    });
  }, [query, activeCat]);

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

      <PageHero
        title={<>Hjælpecenter & <span className="hero-accent-text">ofte stillede spørgsmål</span></>}
        subtitle="Find svar på de mest stillede spørgsmål — eller spring direkte til en af de mest brugte handlinger nedenfor."
        actions={
          <>
            <a
              href="#faq"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
            >
              Se FAQ <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="mailto:kontakt@serviceydere.dk"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-background/25 bg-background/5 px-5 py-2.5 text-sm font-semibold text-background backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-background/10"
            >
              <Mail className="h-4 w-4" /> Skriv til support
            </a>
          </>
        }
      />

      <main id="main">
        {/* TOPICS */}
        <section aria-labelledby="topics" className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 max-w-2xl">
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Genveje
              </span>
              <h2 id="topics" className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
                Populære emner
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
                Fire indgange dækker langt de fleste henvendelser fra både kunder og udbydere.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TOPICS.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-[24px] border border-border/60 p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 ${t.tone}`}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-background/30 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-background/70 backdrop-blur">
                    <t.Icon className="h-5 w-5" />
                  </div>
                  <div className="relative mt-6">
                    <h3 className="text-[16px] font-semibold leading-tight tracking-tight">{t.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-6 opacity-80">{t.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold">
                      {t.label}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 bg-secondary py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
              <div>
                <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="h-px w-6 bg-foreground/30" />
                  FAQ
                </span>
                <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
                  Ofte stillede spørgsmål
                </h2>
              </div>
              <p className="text-[15px] leading-7 text-muted-foreground md:text-base lg:pt-3">
                Korte, ærlige svar på det vi oftest bliver spurgt om — fra første
                tilbudsforespørgsel til opsigelse af et udbyder-abonnement.
              </p>
            </div>

            {/* Search + category filter */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Søg i FAQ — fx tilbud, fradrag, abonnement…"
                  className="h-12 w-full rounded-full border border-border/70 bg-card pl-11 pr-10 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                    aria-label="Ryd søgning"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => {
                  const count = c.key === "Alle" ? FAQ.length : FAQ.filter((f) => f.cat === c.key).length;
                  const active = activeCat === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setActiveCat(c.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border/70 bg-card text-foreground hover:-translate-y-0.5 hover:border-foreground/30"
                      }`}
                    >
                      {c.label}
                      <span className={`text-[11px] font-medium ${active ? "opacity-70" : "text-muted-foreground"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              {filteredFaq.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground sm:px-8">
                  Ingen FAQ matcher “{query}”. Prøv et andet søgeord, eller{" "}
                  <a href="mailto:kontakt@serviceydere.dk" className="font-semibold text-foreground underline underline-offset-4">
                    skriv til support
                  </a>.
                </div>
              )}
              {filteredFaq.map((item, i) => (
                <details
                  key={item.q}
                  className={`group px-6 py-5 sm:px-8 sm:py-6 ${i > 0 ? "border-t border-border/60" : ""} [&_summary::-webkit-details-marker]:hidden`}
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-8 text-left">
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.cat}</span>
                      <span className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base">{item.q}</span>
                    </span>
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition-transform group-open:rotate-45">
                      <Plus className="h-4 w-4" />
                    </span>
                  </summary>
                  <div className="mt-3 max-w-3xl text-[14px] leading-7 text-muted-foreground sm:text-[15px]">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-background py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className="relative isolate overflow-hidden rounded-[28px] px-8 py-12 text-background sm:px-12 sm:py-16"
              style={{ backgroundColor: "hsl(var(--hero-bg))" }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[100px] opacity-30" style={{ backgroundColor: "hsl(var(--hero-mid))" }} />
                <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-[90px] opacity-20" style={{ backgroundColor: "hsl(var(--hero-cyan))" }} />
              </div>
              <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                <div className="max-w-xl">
                  <h2 id="kontakt" className="text-[1.75rem] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[2.25rem]">
                    Kunne du ikke finde svar?
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-background/80">
                    Skriv til os på{" "}
                    <a href="mailto:kontakt@serviceydere.dk" className="font-semibold text-background underline underline-offset-4">
                      kontakt@serviceydere.dk
                    </a>
                    {" "}— vi vender retur så hurtigt vi kan på hverdage.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href="mailto:kontakt@serviceydere.dk"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
                  >
                    <Mail className="h-4 w-4" /> Skriv til support
                  </a>
                  <SmartLink
                    to="/tilbud"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-background/25 bg-background/5 px-5 py-2.5 text-sm font-semibold text-background backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-background/10"
                  >
                    Få 3 gratis tilbud
                  </SmartLink>
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