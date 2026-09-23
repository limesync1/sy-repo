import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";
import { ALL_INDUSTRIES, TOP_CATEGORY_KEYS } from "@/lib/service-taxonomy";
import { IndustryIcon } from "@/components/IndustryIcon";
import { Button } from "@/components/ui/button";

const categories = ALL_INDUSTRIES.map((ind) => ({
  key: ind.key,
  label: ind.label,
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
    className={`group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-card p-4 text-foreground transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/35 hover:shadow-md 2xl:p-5 ${className ?? ""}`}
  >
    <div className="relative flex items-start justify-between">
      <span className="flex h-16 w-16 items-center justify-center">
        <IndustryIcon category={cat.key} className="h-14 w-14" alt={cat.label} />
      </span>
      <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
    </div>
    <div className="relative mt-4 min-w-0">
      <div className="break-words text-[15px] font-semibold leading-snug">{cat.label}</div>
      {cat.hint && (
        <div className="mt-1.5 line-clamp-1 text-[11px] font-medium text-muted-foreground">{cat.hint}</div>
      )}
    </div>
  </Link>

);


const Categories = () => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sorted : sorted.slice(0, INITIAL);

  return (
    <section className="bg-background py-12 sm:py-14 lg:py-16 2xl:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-5 md:mb-8 md:flex-row md:items-end md:justify-between 2xl:mb-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Servicebrancher
            </span>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] text-foreground sm:text-[2.2rem] lg:text-[2.4rem] 2xl:mt-5 2xl:text-[2.75rem]">
              Find den rette branche
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Vælg den type hjælp, du leder efter. Du kan bagefter indtaste by eller postnummer
              og sammenligne virksomheder i nærheden.
            </p>
          </div>
          <Link
            to="/virksomheder"
            className="group inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-foreground/30 md:self-auto"
          >
            Se alle virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Desktop / tablet */}
        <div id="all-service-categories" className="hidden grid-cols-2 gap-4 sm:grid sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((cat) => (
            <CategoryCard key={cat.key} cat={cat} className="min-h-[156px] 2xl:min-h-[172px]" />
          ))}
        </div>

        {sorted.length > INITIAL && (
          <div className="mt-8 hidden justify-center sm:flex">
            <Button
              variant="outline"
              type="button"
              aria-expanded={expanded}
              aria-controls="all-service-categories"
              onClick={() => setExpanded((current) => !current)}
              className="group h-11 rounded-lg px-5"
            >
              {expanded ? "Vis færre brancher" : `Vis alle ${sorted.length} brancher`}
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : "group-hover:translate-y-0.5"}`} />
            </Button>
          </div>
        )}

        {/* Mobil — vandret scroll med alle brancher */}
        <div className="sm:hidden">
          <HorizontalScroller ariaLabel="Servicebrancher — stryg vandret for at se flere" fadeEdges={false}>
            {sorted.map((cat) => (
              <CategoryCard key={cat.key} cat={cat} className="min-h-[168px] w-[calc(100vw-4rem)] max-w-[300px] shrink-0 snap-start" />
            ))}
          </HorizontalScroller>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            Stryg for at se alle {sorted.length} brancher <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </div>
      </div>
    </section>
  );
};

export default Categories;
