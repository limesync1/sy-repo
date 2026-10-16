import { lazy, Suspense } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import TrustBar from "@/components/conversion/TrustBar";
import InlineQuoteTeaser from "@/components/conversion/InlineQuoteTeaser";
import { findTradeCity, PAINTER_CITIES, WINDOW_CITIES, type TradeCity } from "./tradeCityData";

const Footer = lazy(() => import("@/components/landing/Footer"));

type Kind = "vinduespudser" | "maler";

const CONFIG = {
  vinduespudser: {
    list: WINDOW_CITIES, label: "Vinduespudser", plural: "vinduespudsere", category: "Vinduespudsning", priceGuide: "/priser/vinduespudser",
    unit: "kr. pr. vindue (fast aftale)", ref: "kr. pr. besøg, villa med 20–25 vinduer",
    rows: (c: TradeCity) => [
      ["Pris pr. vindue, fast aftale", `${c.unitLow}–${c.unitHigh} kr.`],
      ["Pris pr. vindue, engangsbesøg", `${c.unitLow + 10}–${c.unitHigh + 15} kr.`],
      ["Lejlighed (5–8 vinduer)", `${Math.round(c.unitLow * 6)}–${Math.round(c.unitHigh * 8)} kr.`],
      ["Villa (20–25 vinduer)", `${c.refLow}–${c.refHigh} kr.`],
    ],
    tasks: ["Fast vinduespudsning hver 4., 6. eller 8. uge", "Pudsning ind- og udvendigt", "Ovenlys og kviste", "Rammer og karme", "Erhverv og butiksruder"],
    deduction: "Ja. Vinduespudsning er omfattet af servicefradraget i BoligJob-ordningen. Du skal betale digitalt, og firmaet skal være momsregistreret.",
  },
  maler: {
    list: PAINTER_CITIES, label: "Maler", plural: "malere", category: "Maler", priceGuide: "/priser/maler",
    unit: "kr. pr. m² væg (2 lag, inkl. maling)", ref: "kr. i timen inkl. moms",
    rows: (c: TradeCity) => [
      ["Vægmaling, 2 lag", `${c.unitLow}–${c.unitHigh} kr./m²`],
      ["Loftmaling", `${c.unitLow + 20}–${c.unitHigh + 20} kr./m²`],
      ["Timepris", `${c.refLow}–${c.refHigh} kr.`],
      ["Spartling før maling", "+30–60 kr./m²"],
    ],
    tasks: ["Maling af stue og soveværelser", "Maling før salg eller ved fraflytning", "Lofter og træværk", "Udvendigt træværk og vinduer", "Spartling af ujævne vægge"],
    deduction: "Malerarbejde i en helårsbolig kan give håndværkerfradrag efter BoligJob-ordningens gældende regler. Kun arbejdslønnen tæller, og du skal betale digitalt.",
  },
} as const;

const TradeCityPage = ({ kind }: { kind: Kind }) => {
  const cfg = CONFIG[kind];
  const { city: slug } = useParams<{ city: string }>();
  const city = findTradeCity(cfg.list, slug);
  if (!city) return <Navigate to={`/virksomheder?category=${cfg.category}`} replace />;

  const canonical = `/${kind}/${city.slug}`;
  const fullUrl = `https://serviceydere.dk${canonical}`;
  const title = `${cfg.label} ${city.name}: Priser 2026 · Få 3 tilbud`;
  const description = `${cfg.label} i ${city.name}: ${city.unitLow}–${city.unitHigh} ${cfg.unit}. Se lokale priser og få 3 gratis tilbud fra ${cfg.plural} i ${city.name}.`;
  const rows = cfg.rows(city);

  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Service", serviceType: cfg.category,
      name: `${cfg.label} i ${city.name}`, description,
      provider: { "@type": "Organization", name: "Serviceydere", url: "https://serviceydere.dk/" },
      areaServed: { "@type": "City", name: city.name },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: cfg.label, item: `https://serviceydere.dk${cfg.priceGuide}` },
        { "@type": "ListItem", position: 3, name: city.name, item: fullUrl },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title={title} description={description} canonicalPath={canonical}
        keywords={`${kind} ${city.name}, ${kind} pris ${city.name}, ${cfg.plural} ${city.name}`} jsonLd={jsonLd} />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[{ label: "Forside", to: "/" }, { label: cfg.label, to: cfg.priceGuide }, { label: city.name }]}
        eyebrow={`${cfg.label} · ${city.region} · Opdateret 2026`}
        title={`${cfg.label} i ${city.name}`}
        subtitle={`En ${kind} i ${city.name} koster typisk ${city.unitLow}–${city.unitHigh} ${cfg.unit}. Få op til 3 gratis tilbud fra lokale ${cfg.plural}.`}
      />
      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <article className="article-content prose prose-neutral dark:prose-invert">
          <div className="my-8 rounded-lg border border-border bg-muted/40 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">{city.name} kort fortalt</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              <li>Pris: <strong>{city.unitLow}–{city.unitHigh} {cfg.unit}</strong></li>
              <li>Reference: <strong>{city.refLow}–{city.refHigh} {cfg.ref}</strong></li>
              <li>Postnumre: <strong>{city.postalRange}</strong></li>
            </ul>
          </div>

          <TrustBar />
          <InlineQuoteTeaser category={cfg.category} heading={`Få 3 gratis tilbud fra ${cfg.plural} i ${city.name}`} />

          <h2>{cfg.label} i {city.name}: det skal du vide</h2>
          <p>{city.intro}</p>
          <p>{city.localFactor}</p>

          <h2>Priser i {city.name}</h2>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground"><tr><th className="px-4 py-3 font-semibold">Opgave</th><th className="px-4 py-3 font-semibold">Pris i {city.name}</th></tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map(([a, b]) => <tr key={a}><td className="px-4 py-3">{a}</td><td className="px-4 py-3">{b}</td></tr>)}
              </tbody>
            </table>
            <p className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">Vejledende priser inkl. moms · Opdateret 2026 · <Link to={cfg.priceGuide} className="underline">Se hele prisguiden</Link></p>
          </div>

          <h2>Typiske opgaver</h2>
          <ul>{cfg.tasks.map((t) => <li key={t}>{t}</li>)}</ul>

          <h2>Områder i og omkring {city.name}</h2>
          <p>{city.areas.join(" · ")}</p>

          <h2>Kan jeg få fradrag?</h2>
          <p>{cfg.deduction}</p>

          <div className="not-prose my-10 rounded-xl border border-border bg-primary/5 p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-semibold text-foreground">Få tilbud fra {cfg.plural} i {city.name}</h2>
            <p className="mt-2 text-foreground/80">Beskriv opgaven én gang, og få op til 3 uforpligtende tilbud.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/tilbud" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">Få 3 gratis tilbud</Link>
              <Link to={`/virksomheder?category=${cfg.category}`} className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">Se {cfg.plural}</Link>
            </div>
          </div>

          <h2>Andre byer</h2>
          <p className="text-sm">
            {cfg.label} i andre byer:{" "}
            {cfg.list.filter((c) => c.slug !== city.slug).map((c, i, arr) => (
              <span key={c.slug}><Link to={`/${kind}/${c.slug}`} className="underline">{c.name}</Link>{i < arr.length - 1 ? " · " : ""}</span>
            ))}
          </p>
        </article>
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export const WindowCityPage = () => <TradeCityPage kind="vinduespudser" />;
export const PainterCityPage = () => <TradeCityPage kind="maler" />;
export default TradeCityPage;
