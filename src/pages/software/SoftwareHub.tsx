import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, ArrowRight, Route, Smartphone, CalendarCheck, Receipt,
  Users, MessageSquare, Check, Download,
} from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/landing/PageHero";
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
  { icon: MessageSquare, title: "Brancher", href: "/software/brancher",
    body: "Samme system til rengøring, vinduespudsning, have, håndværk, flytning og autoservice." },
];

const FACTS = [
  "Ruteplanlægning inkluderet i basisprisen",
  "Dansk system, dansk support",
  "Virker på computer, tablet og telefon",
  "Ingen binding — opsig når som helst",
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
        subtitle="Ruteplanlægning, medarbejder-app, booking, kunder, fakturering og markedsplads — samlet ét sted. Søg efter en funktion, eller se hvad systemet består af."
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

      <main id="main" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <nav aria-label="Brødkrumme" className="mb-8 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Forside</Link>
          <span className="px-2">/</span>
          <span className="text-foreground">Software</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Software til servicevirksomheder
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted-foreground">
          {BRAND_DEFINITION}
        </p>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {FACTS.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
              {f}
            </li>
          ))}
        </ul>

        {/* Systemets dele */}
        <h2 className="mt-14 text-2xl font-semibold tracking-tight text-foreground">Hvad systemet består af</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PARTS.map(({ icon: Icon, title, body, href }) => (
            <Link
              key={title}
              to={href}
              className="group rounded-2xl border border-border bg-card p-6 shadow-panel transition-colors hover:bg-secondary/40"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
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

        {/* Guide */}
        <div className="mt-12 grid gap-4 rounded-2xl border border-border bg-muted/35 p-6 sm:grid-cols-[1.4fr_1fr] sm:items-center sm:p-8">
          <div>
            <h2 className="m-0 text-xl font-semibold tracking-tight text-foreground">Slå enhver funktion op</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Funktionsguiden dækker hele systemet — ruteplanlægning, aftaler, kunder, services, medarbejdere,
              leads, livechat og regnskab — med et konkret eksempel og korte trin for hver funktion.
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

        {/* Pris */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-panel sm:p-8">
          <h2 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Hvad koster det</h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-7 text-muted-foreground">
            Serviceydere er ikke et gratis system. I starter med 14 dages gratis prøve uden betalingskort — vil I
            fortsætte, tilføjer I kort under Indstillinger. Basis koster 289 kr./md. ekskl. moms og indeholder
            profil på markedspladsen, kunder, bestillinger, kalender, fakturering og ruteplanlægning med ét
            ejer-login. Ekstra medarbejderlogin 59 kr./md., regnskabsintegration 269 kr./md. som tilvalg.
            Kvartals- og årsbetaling giver 10 % og 20 % rabat. Ingen binding.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/software/priser" className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90">
              Se hele prisoversigten
            </Link>
            <Link to="/opret-virksomhed" className="inline-flex h-11 items-center rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-secondary">
              Start gratis prøve
            </Link>
          </div>
        </div>

        <div className="article-content prose prose-neutral max-w-none dark:prose-invert">
          <ArticleFaqSection items={FAQ} />
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default SoftwareHub;
