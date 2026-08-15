import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, Plus } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/landing/PageHero";
import ArticleFaqSection from "@/components/content/ArticleFaqSection";
import { usePlatformPricing } from "@/hooks/useBusinessPlan";
import { BRAND_DEFINITION } from "@/lib/brand";
import { productPagesExcept } from "./softwareRegistry";

const Footer = lazy(() => import("@/components/landing/Footer"));

/**
 * Offentlig prisside. Tallene hentes fra get_platform_pricing, så siden aldrig
 * kan komme i modstrid med den fakturering kunderne rent faktisk møder. De
 * samme tal ligger som fallback herunder, så siden viser rigtige priser med
 * det samme — også før forespørgslen er hjemme, og hvis den fejler.
 */
const FALLBACK = {
  base_price_dkk: 289,
  price_route_planning_dkk: 0,
  price_accounting_integration_dkk: 269,
  price_data_import_dkk: 1495,
  price_per_employee_login_dkk: 59,
  startup_fee_dkk: 2269,
  discount_quarterly_pct: 10,
  discount_yearly_pct: 20,
  trial_days: 14,
};

const kr = (n: number) =>
  new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(n));

const FAQ = [
  {
    q: "Er priserne inklusive moms?",
    a: "Nej. Alle priser er ekskl. moms, som det er normalt for erhvervsabonnementer.",
  },
  {
    q: "Er ruteplanlægningen et tilvalg?",
    a: "Nej, ruteplanlæggeren er inkluderet i basisprisen på 289 kr./md. Det er kernen i systemet, ikke et modul der skal købes oveni.",
  },
  {
    q: "Hvad koster det pr. medarbejder?",
    a: "59 kr./md. pr. medarbejderlogin. Kun medarbejdere der selv skal se deres rute og tjekke ind og ud, behøver et login.",
  },
  {
    q: "Er der en opstartsomkostning?",
    a: "Ja, 2.269 kr. i opstart. Skal vi importere jeres nuværende kunder fra et regneark eller et andet system, koster det 1.495 kr. som engangsbeløb.",
  },
  {
    q: "Kan jeg prøve det først?",
    a: "Ja. Der er 14 dages prøveperiode, hvor du kan lægge dine egne kunder ind og planlægge en rigtig uge.",
  },
  {
    q: "Kan jeg spare ved at betale for længere perioder?",
    a: "Ja. Kvartalsbetaling giver 10 % rabat og årsbetaling 20 % rabat på abonnementet.",
  },
  {
    q: "Koster det ekstra at være på markedspladsen?",
    a: "Nej. Profilsiden på Serviceydere.dk med online booking følger med. I kan bruge markedspladsen uden planlægningen og planlægningen uden markedspladsen.",
  },
];

const PricingPage = () => {
  const { data } = usePlatformPricing();
  const p = data ?? FALLBACK;

  const [employees, setEmployees] = useState(3);
  const [accounting, setAccounting] = useState(true);
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");

  const calc = useMemo(() => {
    const monthly =
      p.base_price_dkk +
      p.price_route_planning_dkk +
      employees * p.price_per_employee_login_dkk +
      (accounting ? p.price_accounting_integration_dkk : 0);
    const discountPct =
      period === "quarterly" ? p.discount_quarterly_pct : period === "yearly" ? p.discount_yearly_pct : 0;
    return { monthly, discounted: monthly * (1 - discountPct / 100), discountPct };
  }, [p, employees, accounting, period]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Serviceydere — driftssystem til servicevirksomheder",
      description: BRAND_DEFINITION,
      brand: { "@type": "Brand", name: "Serviceydere" },
      url: "https://serviceydere.dk/software/priser",
      offers: {
        "@type": "Offer",
        price: String(p.base_price_dkk),
        priceCurrency: "DKK",
        availability: "https://schema.org/InStock",
        url: "https://serviceydere.dk/software/priser",
        description: `${p.base_price_dkk} kr. pr. måned ekskl. moms. Ruteplanlægning inkluderet. ${p.price_per_employee_login_dkk} kr./md. pr. medarbejderlogin. ${p.trial_days} dages prøveperiode.`,
        eligibleRegion: { "@type": "Country", name: "Danmark" },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Software", item: "https://serviceydere.dk/software" },
        { "@type": "ListItem", position: 3, name: "Priser", item: "https://serviceydere.dk/software/priser" },
      ],
    },
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

  const lines: { label: string; note: string; price: string }[] = [
    { label: "Basis", note: "Kundekartotek, aftaler, booking, profilside og markedsplads", price: `${kr(p.base_price_dkk)} kr./md.` },
    { label: "Ruteplanlægger", note: "Drag & drop, kørselstid, ETA og konfliktadvarsler", price: p.price_route_planning_dkk === 0 ? "Inkluderet" : `${kr(p.price_route_planning_dkk)} kr./md.` },
    { label: "Medarbejderlogin", note: "Pr. medarbejder med adgang til app, rute og tjek ind/ud", price: `${kr(p.price_per_employee_login_dkk)} kr./md.` },
    { label: "Regnskabsintegration", note: "Automatisk bogføring i e-conomic eller Dinero", price: `${kr(p.price_accounting_integration_dkk)} kr./md.` },
    { label: "Dataimport", note: "Vi flytter jeres kunder fra regneark eller et andet system", price: `${kr(p.price_data_import_dkk)} kr. engangs` },
    { label: "Opstart", note: "Opsætning af virksomhed, services og priser", price: `${kr(p.startup_fee_dkk)} kr. engangs` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Priser på Serviceydere — fra ${p.base_price_dkk} kr./md. med ruteplanlægning inkluderet`}
        description={`Se hvad Serviceydere koster: ${p.base_price_dkk} kr./md. i basis med ruteplanlægning inkluderet, ${p.price_per_employee_login_dkk} kr./md. pr. medarbejder og ${p.trial_days} dages prøveperiode. Beregn jeres egen pris.`}
        canonicalPath="/software/priser"
        keywords="serviceydere priser, pris ruteplanlægning software, hvad koster system til servicevirksomhed, pris medarbejder app"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <PageHero
        eyebrow="Priser"
        title="Én pris, ingen skjulte moduler"
        subtitle={`Fra ${kr(p.base_price_dkk)} kr./md. ekskl. moms med ruteplanlægningen inkluderet. ${p.trial_days} dages prøveperiode.`}
        actions={
          <>
            <Link
              to="/opret-virksomhed"
              className="inline-flex h-12 items-center justify-center rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-opacity hover:opacity-90"
            >
              Start prøveperioden
            </Link>
            <Link
              to="/kontakt"
              className="inline-flex h-12 items-center justify-center rounded-full border border-background/25 px-6 text-sm font-semibold text-background transition-colors hover:bg-background/10"
            >
              Book en gennemgang
            </Link>
          </>
        }
      />

      <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <nav aria-label="Brødkrumme" className="mb-8 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Forside</Link>
          <span className="px-2">/</span>
          <Link to="/software" className="hover:text-foreground">Software</Link>
          <span className="px-2">/</span>
          <span className="text-foreground">Priser</span>
        </nav>

        <p className="max-w-3xl text-lg leading-8 text-foreground">
          Serviceydere koster {kr(p.base_price_dkk)} kr. pr. måned ekskl. moms, og ruteplanlæggeren er
          inkluderet i den pris. Oveni betaler I {kr(p.price_per_employee_login_dkk)} kr./md. for hver
          medarbejder, der skal have sin egen app. Alt andet er tilvalg, I selv slår til.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          {/* Prisliste */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-panel">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Prisliste for Serviceydere, alle priser ekskl. moms</caption>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className="px-5 py-3 font-semibold text-foreground">Hvad</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold text-foreground">Pris</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.label} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-4">
                      <span className="font-medium text-foreground">{l.label}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{l.note}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-foreground">{l.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border bg-muted/25 px-5 py-3 text-xs leading-5 text-muted-foreground">
              Alle priser er ekskl. moms. Kvartalsbetaling giver {p.discount_quarterly_pct} % rabat,
              årsbetaling {p.discount_yearly_pct} % rabat på abonnementet.
            </p>
          </div>

          {/* Beregner */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-panel lg:sticky lg:top-24">
            <h2 className="m-0 text-lg font-semibold tracking-tight text-foreground">Beregn jeres pris</h2>

            <div className="mt-5">
              <label htmlFor="employees" className="text-sm font-medium text-foreground">
                Medarbejdere med login
              </label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Færre medarbejdere"
                  onClick={() => setEmployees((n) => Math.max(0, n - 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <input
                  id="employees"
                  type="number"
                  min={0}
                  max={200}
                  value={employees}
                  onChange={(e) => setEmployees(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
                  className="h-9 w-16 rounded-lg border border-border bg-background text-center text-sm font-semibold text-foreground"
                />
                <button
                  type="button"
                  aria-label="Flere medarbejdere"
                  onClick={() => setEmployees((n) => Math.min(200, n + 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-muted/35 p-3">
              <input
                type="checkbox"
                checked={accounting}
                onChange={(e) => setAccounting(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span className="text-sm leading-6 text-foreground">
                Regnskabsintegration
                <span className="block text-xs text-muted-foreground">
                  e-conomic eller Dinero — {kr(p.price_accounting_integration_dkk)} kr./md.
                </span>
              </span>
            </label>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-foreground">Betalingsperiode</legend>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-full bg-muted/50 p-1">
                {([
                  ["monthly", "Måned"],
                  ["quarterly", `Kvartal −${p.discount_quarterly_pct}%`],
                  ["yearly", `År −${p.discount_yearly_pct}%`],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPeriod(key)}
                    aria-pressed={period === key}
                    className={`rounded-full px-2 py-1.5 text-xs font-semibold transition-colors ${
                      period === key
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 rounded-xl border border-border bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Jeres pris</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                {kr(calc.discounted)} kr.
                <span className="text-base font-medium text-muted-foreground"> /md.</span>
              </p>
              {calc.discountPct > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Før rabat {kr(calc.monthly)} kr./md.
                </p>
              )}
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Ekskl. moms. Hertil {kr(p.startup_fee_dkk)} kr. i opstart
                {" "}og {kr(p.price_data_import_dkk)} kr., hvis vi skal flytte jeres data.
              </p>
            </div>

            <Link
              to="/opret-virksomhed"
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background hover:opacity-90"
            >
              Start {p.trial_days} dages prøve
            </Link>
          </div>
        </div>

        {/* Hvad der følger med */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Det følger med i basisprisen</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Ruteplanlægger med drag & drop og beregnet kørselstid",
              "Faste aftaler med automatisk fremskrivning",
              "Kundekartotek med historik og adgangsforhold",
              "Profilside på markedspladsen med online booking",
              "Prisberegner med jeres egne enheder",
              "Tilbud kunden kan godkende online",
              "Livechat med kunderne",
              "Fakturering af udført arbejde",
              "Ubegrænset antal kunder og opgaver",
            ].map((f) => (
              <li key={f} className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
          <h2 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Hvorfor vi viser priserne
          </h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted-foreground">
            Flere systemer i branchen oplyser først prisen efter en samtale. Vi synes, du skal kunne
            regne på det, inden du taler med nogen. Tallene her er de samme, som systemet fakturerer
            efter — de hentes direkte fra vores prisliste, så de ikke kan nå at blive forældede.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/software"
              className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90"
            >
              Se hvad systemet kan
            </Link>
            <Link
              to="/blog/bedste-system-til-servicevirksomheder-2026"
              className="inline-flex h-11 items-center rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Sammenlign med andre systemer
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Resten af systemet</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {productPagesExcept("/software/priser").map((r) => (
              <li key={r.href}>
                <Link
                  to={r.href}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50"
                >
                  <span className="text-sm font-semibold text-foreground">{r.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{r.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

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

export default PricingPage;