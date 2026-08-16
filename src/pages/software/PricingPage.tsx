import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import BusinessOnboarding from "@/components/admin/BusinessOnboarding";
import ArticleFaqSection from "@/components/content/ArticleFaqSection";
import { usePlatformPricing } from "@/hooks/useBusinessPlan";
import { BRAND_DEFINITION } from "@/lib/brand";
import { productPagesExcept } from "./softwareRegistry";

/**
 * Offentlig prisside. Siden bruger nøjagtig samme flow og design som
 * "Bliv udbyder" (/opret-virksomhed): CVR-opslag, valg af funktioner,
 * medarbejderlogins, betalingsperiode og live prisberegning. Tallene
 * hentes fra get_platform_pricing, så prissiden aldrig kan komme i
 * modstrid med den fakturering kunderne rent faktisk møder.
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
    a: "Ja. Der er 14 dages gratis prøve, og du skal ikke oplyse betalingskort for at komme i gang. Vil du fortsætte efter prøven, tilføjer du kort under Indstillinger → Fakturering. Der er ingen binding.",
  },
  {
    q: "Er Serviceydere gratis?",
    a: "Nej. De første 14 dage er gratis, og derefter koster basis 289 kr./md. ekskl. moms med ruteplanlægning inkluderet. Vælger du ikke at fortsætte, sker der ingen betaling.",
  },
  {
    q: "Kan I flytte mine eksisterende kunder ind?",
    a: "Ja, og I skal ikke selv sidde med det. Serviceyderes support står for importen: I sender jeres kundeliste som regneark eller et udtræk fra jeres nuværende system, og vi lægger kunder, adresser, kontaktpersoner og faste aftaler ind for jer. Dataimport koster 1.495 kr. som engangsbeløb.",
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
    { label: "Dataimport", note: "Vores support flytter jeres kunder fra regneark eller et andet system", price: `${kr(p.price_data_import_dkk)} kr. engangs` },
    { label: "Opstart", note: "Opsætning af virksomhed, services og priser", price: `${kr(p.startup_fee_dkk)} kr. engangs` },
  ];

  const breadcrumb = (
    <nav aria-label="Brødkrumme" className="mb-6 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground">Forside</Link>
      <span className="px-2">/</span>
      <Link to="/software" className="hover:text-foreground">Software</Link>
      <span className="px-2">/</span>
      <span className="text-foreground">Priser</span>
    </nav>
  );

  const below = (
    <>
      {/* Fuld prisliste — samme tal som beregneren ovenfor */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Hele prislisten</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
            årsbetaling {p.discount_yearly_pct} % rabat på abonnementet. De første {p.trial_days} dage er gratis,
            og du skal ikke oplyse betalingskort for at komme i gang.
          </p>
        </div>
      </section>

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
            "Livechat med kunderne (slås til når I vil)",
            "Fakturering af udført arbejde",
            `Ét ejer-login — ekstra medarbejderlogin koster ${kr(p.price_per_employee_login_dkk)} kr./md.`,
            "Ingen loft på antal kunder, aftaler eller opgaver",
          ].map((f) => (
            <li key={f} className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
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
    </>
  );

  return (
    <BusinessOnboarding
      variant="pricing"
      breadcrumb={breadcrumb}
      belowContent={below}
      seo={{
        title: `Priser på Serviceydere — fra ${p.base_price_dkk} kr./md. med ruteplanlægning inkluderet`,
        description: `Se hvad Serviceydere koster: ${p.base_price_dkk} kr./md. i basis med ruteplanlægning inkluderet, ${p.price_per_employee_login_dkk} kr./md. pr. medarbejder og ${p.trial_days} dages prøveperiode. Beregn jeres egen pris.`,
        canonicalPath: "/software/priser",
        keywords: "serviceydere priser, pris ruteplanlægning software, hvad koster system til servicevirksomhed, pris medarbejder app",
        jsonLd,
      }}
    />
  );
};

export default PricingPage;
