import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";
import { ALL_INDUSTRIES, TOP_CATEGORY_KEYS } from "@/lib/service-taxonomy";
import { IndustryIcon } from "@/components/IndustryIcon";

/**
 * Hver branche får sin egen, faste kulør. Farven udledes deterministisk af
 * branchens plads i kataloget (gylden vinkel giver maksimal spredning), så to
 * naboer aldrig ligner hinanden — og farven er den samme hver gang siden
 * loades. Kuløren sættes som `--ind` (hue) og bruges i HSL-udtryk, så både
 * lys og mørk tilstand får korrekt kontrast.
 */
const hueFor = (index: number) => Math.round((index * 137.508 + 168) % 360);

const categories = ALL_INDUSTRIES.map((ind, i) => ({
  key: ind.key,
  label: ind.label,
  hue: hueFor(i),
  top: TOP_CATEGORY_KEYS.includes(ind.key),
  hint: ind.subcategories.slice(0, 2).map((s) => s.label).join(" · "),
}));

/* Top-brancherne vises først, resten foldes ud med "Vis alle brancher". */
const sorted = [...categories].sort((a, b) => Number(b.top) - Number(a.top));
const INITIAL = 10;

const CategoryCard = ({
  cat,
  className,
}: {
  cat: (typeof categories)[number];
  className?: string;
}) => (
  <Link
    key={cat.key}
    to={`/search?category=${encodeURIComponent(cat.key)}`}
    style={{ ["--ind" as string]: `${cat.hue}` }}
    className={`group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-border/70 bg-card p-6 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_18px_40px_-30px_hsl(var(--foreground)/0.35)] ${className ?? ""}`}
  >
    {/* Diskret kulør pr. branche — kun som tynd topstribe, ikke som flade. */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      style={{ backgroundColor: "hsl(var(--ind) 65% 45%)" }}
    />
    <IndustryIcon category={cat.key} className="h-10 w-10" alt={cat.label} />
    <div className="relative mt-4">
      <div className="text-[15px] font-semibold leading-tight">{cat.label}</div>
      {cat.hint && (
        <div className="mt-1.5 line-clamp-1 text-[11px] font-medium text-muted-foreground">{cat.hint}</div>
      )}
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
        Se virksomheder
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  </Link>

);

const Categories = () => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sorted : sorted.slice(0, INITIAL);

  return (
    <section className="bg-background pb-16 pt-4 md:pb-24 md:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Servicebrancher
            </span>
            <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
              Find den rette branche
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Alle {categories.length} brancher på Serviceydere — vælg en branche og se
              virksomheder i dit område.
            </p>
          </div>
          <Link
            to="/virksomheder"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-border md:self-auto"
          >
            Se alle virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Desktop / tablet */}
        <div className="hidden grid-cols-2 gap-4 sm:grid sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((cat) => (
            <CategoryCard key={cat.key} cat={cat} className="min-h-[190px]" />
          ))}
        </div>

        {!expanded && sorted.length > INITIAL && (
          <div className="mt-8 hidden justify-center sm:flex">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
            >
              Vis alle {sorted.length} brancher
              <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            </button>
          </div>
        )}

        {/* Mobil — vandret scroll med alle brancher */}
        <div className="sm:hidden">
          <HorizontalScroller>
            {sorted.map((cat) => (
              <CategoryCard key={cat.key} cat={cat} className="w-[170px] shrink-0 snap-start" />
            ))}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
};

export default Categories;
