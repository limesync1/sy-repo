import { lazy, Suspense, useMemo, useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Search, Download, ChevronDown, X, Keyboard } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/landing/PageHero";
import { cn } from "@/lib/utils";
import {
  PLANNER_FEATURES,
  FEATURE_AREAS,
  PLANNER_GUIDE_PDF_PATH,
  searchPlannerFeatures,
  type FeatureArea,
} from "@/data/routePlannerFeatures";

const Footer = lazy(() => import("@/components/landing/Footer"));

/**
 * Søgbar funktionsguide til ruteplanlæggeren. Samme indhold som PDF-guiden
 * (begge læser src/data/routePlannerFeatures.ts), men her kan man søge,
 * filtrere på område og folde hver funktion ud med eksempel og trin.
 */
const FeatureGuidePage = () => {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<FeatureArea | "alle">("alle");
  const [open, setOpen] = useState<string | null>(null);
  const { hash } = useLocation();

  useEffect(() => {
    const id = hash.replace("#", "");
    if (!id) return;
    setOpen(id);
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [hash]);

  const results = useMemo(() => {
    const base = category === "alle"
      ? PLANNER_FEATURES
      : PLANNER_FEATURES.filter((f) => f.area === category);
    return searchPlannerFeatures(query, base);
  }, [query, category]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Funktioner i Serviceydere",
      itemListElement: PLANNER_FEATURES.map((f, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: f.title,
        description: f.summary,
        url: `https://serviceydere.dk/software/funktioner#${f.id}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Software", item: "https://serviceydere.dk/software" },
        { "@type": "ListItem", position: 3, name: "Funktionsguide", item: "https://serviceydere.dk/software/funktioner" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Funktionsguide til Serviceydere | Alle funktioner"
        description="Søg blandt alle funktioner i Serviceydere — ruteplanlægger, aftaler, kunder, services, medarbejdere, leads, livechat og regnskab. Hver funktion med eksempel og korte trin."
        canonicalPath="/software/funktioner"
        keywords="ruteplanlægger guide, brugerguide ruteplanlægning, funktioner ruteplanlægger, serviceydere vejledning"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <PageHero
        eyebrow="Funktionsguide"
        title="Find og forstå hver funktion i Serviceydere"
        subtitle="Søg på tværs af hele systemet — ruteplanlægning, aftaler, kunder, medarbejdere, leads, livechat og regnskab. Hver funktion har et konkret eksempel og korte trin."
        actions={
          <>
            <a
              href={PLANNER_GUIDE_PDF_PATH}
              download
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" aria-hidden />
              Hent PDF om ruteplanlæggeren
            </a>
            <Link
              to="/software/ruteplanlaegger"
              className="inline-flex h-12 items-center justify-center rounded-full border border-background/25 px-6 text-sm font-semibold text-background transition-colors hover:bg-background/10"
            >
              Om ruteplanlæggeren
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
          <span className="text-foreground">Funktionsguide</span>
        </nav>

        <h1 className="sr-only">Funktionsguide til Serviceydere</h1>

        {/* Søgning */}
        <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <label className="relative block">
            <span className="sr-only">Søg i funktioner</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg fx “syg”, “faktura”, “prisberegner” eller “print”"
              className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-11 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Ryd søgning"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["alle", ...FEATURE_AREAS] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c as FeatureArea | "alle")}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  category === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "alle" ? "Alle områder" : c}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {results.length} {results.length === 1 ? "funktion" : "funktioner"}
          {query && <> matcher “{query}”</>}
        </p>

        {/* Resultater */}
        <div className="mt-4 grid gap-3 xl:grid-cols-2 xl:items-start">
          {results.map((f) => {
            const expanded = open === f.id;
            return (
              <article
                key={f.id}
                id={f.id}
                className="scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card shadow-panel"
              >
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : f.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-start gap-3 p-5 text-left transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold tracking-tight text-foreground">{f.title}</h2>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {f.category ?? f.area}
                      </span>
                      {f.shortcut && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <Keyboard className="h-3 w-3" aria-hidden />
                          {f.shortcut}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.summary}</p>
                  </div>
                  <ChevronDown
                    className={cn("mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
                    aria-hidden
                  />
                </button>

                {expanded && (
                  <div className="border-t border-border px-5 pb-5 pt-4">
                    <div className="rounded-xl bg-secondary/40 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Eksempel</p>
                      <p className="mt-1.5 text-sm leading-6 text-foreground">{f.example}</p>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sådan gør du</p>
                    <ol className="mt-2 space-y-2">
                      {f.steps.map((s, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                            {i + 1}
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </article>
            );
          })}

          {results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center xl:col-span-2">
              <p className="text-sm font-semibold text-foreground">Ingen funktioner matcher søgningen</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prøv et andet ord — eller <button type="button" className="underline" onClick={() => { setQuery(""); setCategory("alle"); }}>ryd filtrene</button>.
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-panel sm:p-8">
          <h2 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Vil du hellere prøve det?</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            Opret virksomheden og kør 14 dage gratis uden betalingskort. Vi hjælper gerne med at flytte jeres eksisterende kunder ind.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/opret-virksomhed" className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90">
              Start 14 dages gratis prøve
            </Link>
            <a href={PLANNER_GUIDE_PDF_PATH} download className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-secondary">
              <Download className="h-4 w-4" aria-hidden /> Hent PDF-guiden
            </a>
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default FeatureGuidePage;
