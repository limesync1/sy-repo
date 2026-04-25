import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";
import { INDUSTRY_GROUPS } from "@/lib/service-taxonomy";

/* Tonefarver roteres pænt på tværs af kategorier — bruger samme tokens som resten af forsiden. */
const TONES = [
  "bg-feature-cool text-feature-cool-foreground",
  "bg-feature-warm text-feature-warm-foreground",
  "bg-feature-lilac text-feature-lilac-foreground",
  "bg-accent-soft text-accent",
] as const;

/**
 * Vi viser de 10 mest relevante brancher fra det kanoniske taksonomi-katalog.
 * Rækkefølgen matcher INDUSTRY_GROUPS (Rengøring & ejendom først), så forsiden
 * altid spejler det virksomhederne faktisk kan vælge i panelet.
 */
const categories = INDUSTRY_GROUPS.flatMap((g) => g.industries)
  .slice(0, 10)
  .map((ind, i) => ({
    label: ind.label,
    icon: ind.icon,
    key: ind.key,
    tone: TONES[i % TONES.length],
  }));

const Categories = () => {
  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Find den rette branche
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
              De mest brugte servicebrancher — vælg én og se virksomheder i dit område.
            </p>
          </div>
          <Link
            to="/virksomheder"
            className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary md:self-auto"
          >
            Se alle brancher
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Desktop / tablet — pæn 5-kolonners grid med hover-løft */}
        <div className="hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
          {categories.map((cat) => (
            <Link
              key={cat.key}
              to={`/search?category=${encodeURIComponent(cat.key)}`}
              className={`group relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-[22px] border border-border/60 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${cat.tone}`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-background/40 bg-background/85 text-xl shadow-sm">
                <span aria-hidden>{cat.icon}</span>
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">{cat.label}</div>
                <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium opacity-75">
                  Se virksomheder
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobil — vandret scroll med snap så alle kort er ens og letlæselige */}
        <div className="sm:hidden">
          <HorizontalScroller>
            {categories.map((cat) => (
              <Link
                key={cat.key}
                to={`/search?category=${encodeURIComponent(cat.key)}`}
                className={`flex w-[148px] shrink-0 snap-start flex-col gap-4 rounded-[20px] border border-border/60 p-4 shadow-sm ${cat.tone}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-background/40 bg-background/85 text-xl shadow-sm">
                  <span aria-hidden>{cat.icon}</span>
                </div>
                <div className="text-sm font-semibold leading-tight">{cat.label}</div>
              </Link>
            ))}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
};

export default Categories;
