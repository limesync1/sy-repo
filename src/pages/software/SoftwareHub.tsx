import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, ArrowRight, Route, Smartphone, CalendarCheck, Receipt,
  Users, Building2, Check, Download,
} from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/landing/PageHero";
import SectionShell from "@/components/landing/SectionShell";
import ArticleFaqSection from "@/components/content/ArticleFaqSection";
import { BRAND_DEFINITION, BRAND_FEATURE_LIST } from "@/lib/brand";
import { PLANNER_GUIDE_PDF_PATH } from "@/data/routePlannerFeatures";

const Footer = lazy(() => import("@/components/landing/Footer"));

/**
 * Forsiden for /software. Bevidst kort: et søgefelt der fører direkte ned i
 * funktionsguiden, seks kort over systemets dele, prisen i klar tekst og en
 * kort FAQ. De lange forklaringer bor på underssiderne — ikke her.
 */

const PARTS = [
  { icon: Route, title: "Ruteplanlægger", href: "/software/ruteplanlaegger",
    body: "Ugens ruter med drag & drop, kørselstid, faste aftaler, sygemelding i tre trin og konfliktadvarsler." },
  { icon: Smartphone, title: "Medarbejder-app", href: "/software/medarbejder-app",
    body: "Medarbejderen ser dagens rute på telefonen, starter dagen og markerer stop udført." },
  { icon: CalendarCheck, title: "Booking og tilbud", href: "/software/booking-og-tilbud",
    body: "Online booking fra jeres profilside plus leads fra markedspladsen — samlet ét sted." },
  { icon: Receipt, title: "Fakturering og regnskab", href: "/software/fakturering-og-regnskab",
    body: "Fakturér udført arbejde og send det videre til e-conomic eller Dinero." },
  { icon: Users, title: "Kunder og medarbejdere", href: "/software/funktioner",
    body: "Kundekartotek med kontaktpersoner og dokumenter, medarbejderlogin, kompetencer og provision." },
  { icon: Building2, title: "Brancher", href: "/software/brancher",
    body: "Samme system til rengøring, vinduespudsning, have, håndværk, flytning og autoservice." },
];

const FACTS = [
  "Ruteplanlægning inkluderet i basisprisen",
  "Dansk system, dansk support",
  "Virker på computer, tablet og telefon",
  "Ingen binding — opsig når som helst",
];

const PRICE_POINTS = [
  { label: "Prøveperiode", value: "14 dage", note: "Gratis, uden betalingskort" },
  { label: "Basis", value: "289 kr./md.", note: "Ekskl. moms — ruteplanlægning inkluderet" },
  { label: "Ekstra login", value: "59 kr./md.", note: "Pr. medarbejder med eget login" },
  { label: "Regnskab", value: "269 kr./md.", note: "Tilvalg: e-conomic eller Dinero" },
];


const FAQ = [
  { q: "Hvad er Serviceydere?", a: "Serviceydere er en dansk platform til servicevirksomheder. Den indeholder et driftssystem med ruteplanlægning, medarbejder-app, booking, kundekartotek og fakturering — og en markedsplads på serviceydere.dk, hvor kunder finder og booker udbydere." },
  { q: "Er Serviceydere gratis?", a: "Nej. Der er 14 dages gratis prøve uden betalingskort, og derefter vælger I selv, om I vil tilføje kort og fortsætte. Basisprisen er 289 kr./md. ekskl. moms med ruteplanlægning inkluderet, plus 59 kr./md. pr. ekstra medarbejderlogin. Ingen binding." },
  { q: "Kan jeg flytte mine eksisterende kunder ind?", a: "Ja — og I skal ikke selv sidde med det. Serviceyderes support står for importen: I sender jeres kundeliste som regneark eller et udtræk fra jeres nuværende system, og vi lægger kunder, adresser, kontaktoplysninger og faste aftaler ind. Dataimport er en engangsydelse, som fremgår af prissiden." },
  { q: "Er systemet kun til rengøring?", a: "Nej. Det er brancheuafhængigt og bruges blandt andet af rengøring, vinduespudsning, haveservice, håndværkere, flyttefirmaer, skadedyrsbekæmpelse og autoservice. Kategorier, services og prisenheder defineres af virksomheden selv." },
  { q: "Kan jeg bruge systemet uden at være på markedspladsen?", a: "Ja. De to dele kan bruges uafhængigt. I kan planlægge og fakturere jeres egne kunder uden at tage imod leads — og være synlige på markedspladsen uden at bruge planlægningen." },
  { q: "Hvilke regnskabsprogrammer kan det tale med?", a: "e-conomic og Dinero. Bestillinger og fakturaer kan bogføres automatisk, når integrationen er slået til. Integrationen er et tilvalg til 269 kr./md." },
];

const jsonLd: Record<string, unknown>[] = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Serviceydere",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Field Service Management",
    operatingSystem: "Web, iOS, Android (webapp)",
    url: "https://serviceydere.dk/software",
    inLanguage: "da-DK",
    description: BRAND_DEFINITION,
    featureList: BRAND_FEATURE_LIST,
    offers: {
      "@type": "Offer",
      price: "289",
      priceCurrency: "DKK",
      url: "https://serviceydere.dk/software/priser",
      description:
        "289 kr. pr. måned ekskl. moms med ruteplanlægning inkluderet. 14 dages gratis prøve uden betalingskort, derefter valgfri fortsættelse. Ekstra medarbejderlogin 59 kr./md. Ingen binding.",
    },
    provider: { "@type": "Organization", name: "Serviceydere", url: "https://serviceydere.dk/" },
    areaServed: { "@type": "Country", name: "Danmark" },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
      { "@type": "ListItem", position: 2, name: "Software", item: "https://serviceydere.dk/software" },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

const SoftwareHub = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/software/funktioner${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Software til servicevirksomheder | Serviceydere"
        description="Ruteplanlægning, medarbejder-app, booking, kunder, fakturering og markedsplads i ét dansk system. 14 dages gratis prøve uden betalingskort, derefter 289 kr./md."
        canonicalPath="/software"
        keywords="system til servicevirksomheder, ruteplanlægning software, serviceplanlægning, rengøringssystem, håndværkersystem, field service management danmark"
        jsonLd={jsonLd}
      />
      <SiteNav />

      <PageHero
        eyebrow="Software til virksomheder"
        title="Ét system til planlægning, drift og nye kunder"
        subtitle="Ruteplanlægning, medarbejder-app, booking, kunder og fakturering — samlet ét sted."
        actions={
          <>
            <Link
              to="/opret-virksomhed"
              className="inline-flex h-12 items-center justify-center rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-opacity hover:opacity-90"
            >
              Start 14 dages gratis prøve
            </Link>
            <Link
              to="/software/priser"
              className="inline-flex h-12 items-center justify-center rounded-full border border-background/25 px-6 text-sm font-semibold text-background transition-colors hover:bg-background/10"
            >
              Se priser
            </Link>
          </>
        }
      >
        {/* Søgning direkte i heroen — så funktionsguiden er det første man ser. */}
        <form onSubmit={submit} className="mt-6 max-w-xl" role="search">
          <label className="relative block">
            <span className="sr-only">Søg i systemets funktioner</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg fx “sygemelding”, “faktura” eller “fast aftale”"
              className="h-12 w-full rounded-full border border-border bg-background pl-11 pr-28 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center rounded-full bg-foreground px-4 text-xs font-semibold text-background hover:opacity-90"
            >
              Søg
            </button>
          </label>
          <p className="mt-2 text-xs text-background/70">
            Søger i funktionsguiden med eksempler og trin for hver funktion.
          </p>
        </form>
      </PageHero>

      <main id="main">
        {/* Fakta-stribe direkte under heroen — korte signaler, ingen brødtekst */}
        <div className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-7 gap-y-2 px-4 py-4 sm:px-6 lg:px-8">
            {FACTS.map((f) => (
              <span key={f} className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                {f}
              </span>
            ))}
          </div>
        </div>


        {/* Systemets dele */}
        <SectionShell
          eyebrow="Overblik"
          title="Hvad systemet består af"
          description="Seks dele — klik på den, der er relevant for jer."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PARTS.map(({ icon: Icon, title, body, href }, i) => (
              <Link
                key={title}
                to={href}
                style={{ ["--part" as string]: `${Math.round((i * 137.508 + 186) % 360)}` }}
                className="group relative flex flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_22px_45px_-32px_hsl(var(--foreground)/0.4)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--part)_70%_94%)] text-[hsl(var(--part)_60%_30%)] dark:bg-[hsl(var(--part)_45%_16%)] dark:text-[hsl(var(--part)_70%_78%)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 flex items-center gap-1.5 text-base font-semibold tracking-tight text-foreground">
                  {title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </Link>
            ))}
          </div>
        </SectionShell>

        {/* Guide */}
        <SectionShell tone="muted" compact>
          <div className="grid gap-5 rounded-[28px] border border-border bg-card p-6 shadow-sm sm:grid-cols-[1.4fr_1fr] sm:items-center sm:p-8">
            <div>
              <h2 className="m-0 text-xl font-semibold tracking-tight text-foreground">Slå enhver funktion op</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Funktionsguiden dækker hele systemet — med et konkret eksempel og korte trin for hver funktion.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:justify-end">
              <Link to="/software/funktioner" className="inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">
                Åbn funktionsguiden
              </Link>
              <a href={PLANNER_GUIDE_PDF_PATH} download className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-secondary">
                <Download className="h-4 w-4" aria-hidden /> PDF-guide
              </a>
            </div>
          </div>
        </SectionShell>

        {/* Pris — korte punkter i stedet for en tekstmur */}
        <SectionShell
          eyebrow="Pris"
          title="Hvad koster det"
          description="14 dages gratis prøve uden betalingskort. Vil I fortsætte, tilføjer I kort under Indstillinger."
          aside={
            <div className="flex flex-wrap gap-3">
              <Link to="/software/priser" className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90">
                Se prisoversigten
              </Link>
              <Link to="/opret-virksomhed" className="inline-flex h-11 items-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-secondary">
                Start gratis prøve
              </Link>
            </div>
          }
        >
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRICE_POINTS.map((p) => (
              <div key={p.label} className="rounded-[22px] border border-border/70 bg-card p-5 shadow-sm">
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{p.label}</dt>
                <dd className="mt-2 text-xl font-semibold tracking-tight text-foreground">{p.value}</dd>
                <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
              </div>
            ))}
          </dl>
        </SectionShell>

        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="article-content prose prose-neutral max-w-none dark:prose-invert">
            <ArticleFaqSection items={FAQ} />
          </div>
        </div>
      </main>


      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default SoftwareHub;
