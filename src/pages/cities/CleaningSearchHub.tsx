import { lazy, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Search, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/landing/PageHero";
import TrustBar from "@/components/conversion/TrustBar";
import { CITIES } from "./cleaningCityData";

const Footer = lazy(() => import("@/components/landing/Footer"));

const fmt = (n: number) => n.toLocaleString("da-DK");

/**
 * Hub-side hvor kunder søger efter rengøringsvirksomhed i deres by og ser
 * lokale priser. Linker videre til de by-specifikke sider (/rengoering/:city)
 * og til prissiderne. Mål-keywords: "rengøringsfirma", "find rengøring",
 * "rengøringsvirksomhed [by]".
 */
const CleaningSearchHub = () => {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.postalRange.includes(q) ||
        c.neighborhoods.some((n) => n.toLowerCase().includes(q)),
    );
  }, [query]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Rengøringsfirmaer i Danmark — find din by",
    itemListElement: CITIES.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `Rengøring i ${c.name}`,
      url: `https://serviceydere.dk/rengoering/${c.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find rengøringsvirksomhed i din by — se priser | Serviceydere"
        description="Søg efter rengøringsfirmaer i din by og se lokale priser på privat- og erhvervsrengøring. Sammenlign og få op til 3 gratis tilbud — uforpligtende."
        canonicalPath="/rengoering"
        keywords="rengøringsfirma, rengøringsvirksomhed, find rengøring, rengøring priser, rengøringshjælp, privat rengøring, erhvervsrengøring"
      />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <SiteNav />

      <PageHero
        tone="teal"
        eyebrow="Rengøring i hele Danmark"
        title="Find en rengøringsvirksomhed i din by."
        subtitle="Søg på din by eller dit postnummer og se lokale priser med det samme — derefter kan du få op til 3 gratis tilbud."
      />

      {/* Søgefelt */}
      <section className="px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 shadow-sm focus-within:border-foreground/30">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg på by, postnummer eller område — fx Aarhus eller 8000"
              aria-label="Søg efter by"
              className="h-13 w-full bg-transparent py-3.5 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {results.length} {results.length === 1 ? "by" : "byer"} med lokale priser og virksomheder
          </p>
        </div>
      </section>

      {/* By-kort med priser */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.length === 0 && (
            <div className="col-span-full rounded-[1.75rem] border border-border bg-card p-10 text-center">
              <p className="text-lg font-semibold text-foreground">Vi fandt ikke "{query}"</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Vi dækker hele Danmark — beskriv din opgave, så finder vi en rengøringsvirksomhed nær dig.
              </p>
              <Link
                to="/tilbud?category=Reng%C3%B8ring"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="h-4 w-4" /> Få tilbud alligevel
              </Link>
            </div>
          )}
          {results.map((c) => (
            <Link
              key={c.slug}
              to={`/rengoering/${c.slug}`}
              className="group rounded-[1.5rem] border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.3)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{c.name}</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {c.region} · {c.postalRange}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timepris</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">{fmt(c.hourlyLow)}–{fmt(c.hourlyHigh)} kr.</p>
                </div>
                <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fast pr. besøg</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">{fmt(c.flatLow)}–{fmt(c.flatHigh)} kr.</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{c.intro}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Links til prissiderne */}
      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Se priserne i detaljer</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vores prisguider viser, hvad du kan forvente at betale — og hvordan du får BoligJob-fradrag.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/priser/rengoering", label: "Rengøring pris", text: "Timepris og fast pris for privat- og erhvervsrengøring" },
              { href: "/guides/privatrengoering", label: "Privatrengøring", text: "Pris, fradrag og sådan finder du rengøringshjælp" },
              { href: "/guides/erhvervsrengoering", label: "Erhvervsrengøring", text: "Pris pr. m² og valg af rengøringsfirma" },
              { href: "/priser/vinduespudser", label: "Vinduespudsning pris", text: "Pris pr. vindue og abonnement" },
            ].map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20"
              >
                <p className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                  {l.label}
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{l.text}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/tilbud?category=Reng%C3%B8ring"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" /> Få op til 3 gratis tilbud
            </Link>
          </div>
        </div>
      </section>

      <TrustBar />
      <Footer />
    </div>
  );
};

export default CleaningSearchHub;
