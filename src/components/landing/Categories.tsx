import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";
import { topCategories } from "@/lib/service-taxonomy";

/* Tonefarver roteres pænt på tværs af kategorier — bruger samme tokens som resten af forsiden. */
const TONES = [
  "bg-feature-cool text-feature-cool-foreground",
  "bg-feature-warm text-feature-warm-foreground",
  "bg-feature-lilac text-feature-lilac-foreground",
  "bg-accent-soft text-accent",
] as const;

/**
 * Vi viser de kuraterede top-brancher fra `topCategories()`. Listen styres ét
 * sted i `service-taxonomy.ts` (TOP_CATEGORY_KEYS), så forsiden altid spejler
 * præcist hvad virksomheder faktisk kan vælge i virksomhedsindstillinger.
 */
const categories = topCategories().map((ind, i) => ({
  label: ind.label,
  icon: ind.icon,
  key: ind.key,
  tone: TONES[i % TONES.length],
  // Kort, læsbar undertekst genereret fra de første 2 underbrancher.
  hint: ind.subcategories.slice(0, 2).map((s) => s.label).join(" · "),
}));

const Categories = () => {
  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Sektionsoverskrift — venstrejusteret, samme rytme som resten af forsiden */}
        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Servicebrancher
            </span>
            <h2 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-foreground md:text-[2.25rem]">
              Find den rette branche
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
              De mest efterspurgte udkørende serviceydere — vælg en branche og se virksomheder i dit område.
            </p>
          </div>
          <Link
            to="/virksomheder"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:self-auto"
          >
            Se alle brancher
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Desktop / tablet — luftig grid med hover-løft og tydeligere hierarki */}
        <div className="hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
          {categories.map((cat) => (
            <Link
              key={cat.key}
              to={`/search?category=${encodeURIComponent(cat.key)}`}
              className={`group relative flex min-h-[170px] flex-col justify-between overflow-hidden rounded-[22px] border border-border/60 p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${cat.tone}`}
            >
              {/* Subtil glow ved hover */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-background/30 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-background/40 bg-background/90 text-2xl shadow-sm">
                <span aria-hidden>{cat.icon}</span>
              </div>
              <div className="relative">
                <div className="text-[15px] font-semibold leading-tight">{cat.label}</div>
                {cat.hint && (
                  <div className="mt-1 line-clamp-1 text-[11px] font-medium opacity-70">
                    {cat.hint}
                  </div>
                )}
                <div className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold opacity-80">
                  Se virksomheder
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobil — vandret scroll med snap, ensartede kort */}
        <div className="sm:hidden">
          <HorizontalScroller>
            {categories.map((cat) => (
              <Link
                key={cat.key}
                to={`/search?category=${encodeURIComponent(cat.key)}`}
                className={`flex w-[160px] shrink-0 snap-start flex-col gap-4 rounded-[20px] border border-border/60 p-4 shadow-sm ${cat.tone}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-background/40 bg-background/90 text-2xl shadow-sm">
                  <span aria-hidden>{cat.icon}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">{cat.label}</div>
                  {cat.hint && (
                    <div className="mt-1 line-clamp-1 text-[11px] font-medium opacity-70">
                      {cat.hint}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
};

export default Categories;
