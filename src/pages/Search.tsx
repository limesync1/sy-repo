import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import BusinessCover from "@/components/shared/media/BusinessCover";
import BusinessLogo from "@/components/shared/media/BusinessLogo";
import { useSearchParams, Link } from "react-router-dom";
import { IndustryIcon } from "@/components/IndustryIcon";
import { useAllBusinesses, type SortOption } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FavoriteButton from "@/components/business/FavoriteButton";
import { useUserLocation } from "@/contexts/LocationContext";
import { distanceBetweenZipsKm, lookupDkZip, haversineKm } from "@/lib/dk-postcodes";
import SEO from "@/components/SEO";
import {
  Search as SearchIcon,
  MapPin,
  Star,
  ShieldCheck,
  SlidersHorizontal,
  Building2,
  X,
  Navigation,
  Map as MapIcon,
  List,
  Phone,
  ArrowRight,
} from "lucide-react";
// Mapbox er tung (~120KB gzipped) — load kun når brugeren faktisk skifter til kort-view.
const ResultsMap = lazy(() => import("@/components/search/ResultsMap"));
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/landing/PageHero";
import Footer from "@/components/landing/Footer";
import { topCategories, searchIndustries } from "@/lib/service-taxonomy";
import SearchSuggest from "@/components/landing/SearchSuggest";
import LocationChip from "@/components/LocationChip";

import { CardGridSkeleton } from "@/components/admin/shared/Skeletons";

/** Brancher hentes fra det kanoniske taksonomi-katalog så de matcher
 *  præcis det virksomheder kan vælge i panelet. */
const CATEGORIES = topCategories().map((ind) => ({
  label: ind.label,
  key: ind.key,
  icon: ind.icon,
}));

const BusinessCard = ({
  biz,
  onHover,
  isHighlighted,
}: {
  biz: any;
  onHover?: (id: string | null) => void;
  isHighlighted?: boolean;
}) => {
  const cats: string[] = Array.isArray(biz.categories) && biz.categories.length > 0
    ? biz.categories
    : biz.category ? [biz.category] : [];
  const primaryCat = cats[0];
  const extra = cats.length - 1;
  const avg = biz._avgRating || 0;
  const cnt = biz._reviewCount || 0;

  // Stop propagation on action buttons so the wrapping link doesn't navigate.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Link
      to={`/b/${biz.slug}`}
      onMouseEnter={() => onHover?.(biz.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group relative flex h-full flex-col overflow-visible rounded-[24px] border border-border/70 bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_20px_45px_-30px_hsl(var(--foreground)/0.35)] ${
        isHighlighted ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
      }`}
    >
      {/*
       * Wrapper-div må IKKE have overflow-hidden, ellers bliver logoet (som
       * stikker ud i bunden med -bottom-5) klippet af. Cover-billedet får
       * sin egen overflow-hidden — og logoet ligger som søsken oven på.
       */}
      <div className="relative aspect-[4/3] w-full">
        <BusinessCover
          url={biz.cover_image_url}
          name={biz.name}
          alt={`${biz.name}${biz.city ? ` i ${biz.city}` : ""}${primaryCat ? ` – ${primaryCat}` : " – serviceydere"}`}
          ratio="3/2"
          sizes="(max-width: 640px) 100vw, 360px"
          widths={[320, 480, 640, 960]}
          className="absolute inset-0 h-full rounded-[18px]"
        />

        <div onClick={stop}>
          <FavoriteButton businessId={biz.id} />
        </div>

        {biz.is_verified && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
            <ShieldCheck className="h-3 w-3 text-accent" />
            Verificeret
          </div>
        )}

        {biz.logo_url && (
          <BusinessLogo
            url={biz.logo_url}
            name={biz.name}
            size={56}
            className="absolute -bottom-5 left-4 z-10 border-2 border-card shadow-md"
          />
        )}
      </div>

      <div className={`flex flex-1 flex-col gap-1 px-2 pb-1 ${biz.logo_url ? "pt-6" : "pt-3"}`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground line-clamp-1 group-hover:text-accent transition-colors">{biz.name}</h3>
          {cnt > 0 ? (
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
              <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
              <span className="text-muted-foreground">({cnt})</span>
            </div>
          ) : (
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Ny</span>
          )}
        </div>

        {primaryCat && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
              {primaryCat}
            </span>
            {extra > 0 && (
              <span className="text-[11px] font-medium text-muted-foreground">+{extra} mere</span>
            )}
          </div>
        )}

        {biz.city && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{biz.zip_code ? `${biz.zip_code} ` : ""}{biz.city}</span>
          </div>
        )}

        {typeof biz._distanceKm === "number" && (
          <div className="mt-0.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
              <Navigation className="h-3 w-3" />
              {biz._distanceKm < 1 ? "<1 km væk" : `${Math.round(biz._distanceKm)} km væk`}
            </span>
          </div>
        )}

        {/* Quick actions — visible on hover (desktop) and always on touch devices for accessibility */}
        <div className="mt-auto flex items-center gap-2 pt-3 opacity-100 transition-opacity sm:opacity-70 sm:group-hover:opacity-100">
          <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[12px] font-semibold text-background hover:bg-foreground/90">
            Se virksomhed
            <ArrowRight className="h-3 w-3" />
          </span>
          {biz.phone && (
            <a
              href={`tel:${biz.phone}`}
              onClick={stop}
              aria-label={`Ring til ${biz.name}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-foreground/40 hover:bg-secondary"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </Link>
  );
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialQuery = searchParams.get("q") || "";
  const initialSort = (searchParams.get("sort") as SortOption) || "relevance";

  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    setDebouncedQuery(searchParams.get("q") || "");
    setSelectedCategory(searchParams.get("category") || "");
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (sort !== "relevance") params.set("sort", sort);
    setSearchParams(params, { replace: true });
  }, [selectedCategory, debouncedQuery, sort, setSearchParams]);

  const { data: businesses, isLoading } = useAllBusinesses(
    selectedCategory || undefined,
    debouncedQuery || undefined,
    sort,
  );

  const { location, radiusKm } = useUserLocation();

  // Apply location-based ranking + radius filtering.
  // 1) When a radius is set AND the user has a known zip, drop businesses outside the radius.
  // 2) Boost in-city/zip results when sort is "relevance".
  // Falls back gracefully if a business has no zip (kept, but ranked lower).
  const rankedBusinesses = useMemo(() => {
    if (!businesses) return businesses;

    const userPoint = lookupDkZip(location.zip);
    const cityLower = location.city?.toLowerCase() || "";
    const zipPrefix = location.zip ? location.zip.slice(0, 2) : "";

    let scored = businesses.map((b: any) => {
      // Distance — only meaningful when both points resolve.
      let distanceKm: number | null = null;
      if (userPoint) {
        const bizPoint = lookupDkZip(b.zip_code);
        if (bizPoint) distanceKm = haversineKm(userPoint, bizPoint);
      } else if (location.zip) {
        distanceKm = distanceBetweenZipsKm(location.zip, b.zip_code);
      }

      let locScore = 0;
      const bCity = (b.city || "").toLowerCase();
      const bZip = (b.zip_code || "").toString();
      if (cityLower && bCity && bCity.includes(cityLower)) locScore += 20;
      if (zipPrefix && bZip.startsWith(zipPrefix)) locScore += 10;
      // Closer = higher score (max +25 boost at 0 km, decays linearly to 0 at 100 km).
      if (distanceKm !== null) {
        locScore += Math.max(0, 25 - distanceKm / 4);
      }
      return { ...b, _locScore: locScore, _distanceKm: distanceKm };
    });

    // Radius filter — only when user has a resolvable location AND a radius is chosen.
    if (radiusKm !== null && userPoint) {
      const within = scored.filter((b: any) => b._distanceKm !== null && b._distanceKm <= radiusKm);
      // If we'd otherwise show 0 results, keep all so the user isn't left with nothing,
      // and rely on ranking + the radius pill to communicate the filter.
      if (within.length > 0) scored = within;
    }

    // Distance sort — closest first; rows without a known distance go last.
    if (sort === "distance") {
      return [...scored].sort((a, b) => {
        const da = a._distanceKm ?? Infinity;
        const db = b._distanceKm ?? Infinity;
        return da - db;
      });
    }

    // Only re-rank when sort is "relevance" — respect user's explicit sort otherwise.
    if (sort !== "relevance") return scored;
    return [...scored].sort((a, b) => (b._locScore || 0) - (a._locScore || 0));
  }, [businesses, location, radiusKm, sort]);

  const userPoint = useMemo(() => lookupDkZip(location.zip), [location.zip]);

  /** Brancheforslag ud fra fritekst — bruges både til at rykke relevante
   *  chips frem i filterbaren og til "Mente du…" i tom-tilstanden. */
  const queryMatchedCategories = useMemo(() => {
    const term = debouncedQuery.trim();
    if (term.length < 2) return [] as string[];
    return searchIndustries(term, { limit: 4, preferTopKeys: true }).map((h) => h.industry.key);
  }, [debouncedQuery]);

  /** Chips i filterbaren: valgt branche først, derefter dem der matcher
   *  søgeordet, så det mest relevante altid er inden for rækkevidde. */
  const orderedCategories = useMemo(() => {
    const priority = new Set([selectedCategory, ...queryMatchedCategories].filter(Boolean));
    if (priority.size === 0) return CATEGORIES;
    return [
      ...CATEGORIES.filter((c) => priority.has(c.key)),
      ...CATEGORIES.filter((c) => !priority.has(c.key)),
    ];
  }, [selectedCategory, queryMatchedCategories]);

  const handleCategoryClick = (cat: string) =>
    setSelectedCategory(selectedCategory === cat ? "" : cat);


  const clearFilters = () => {
    setDebouncedQuery("");
    setSelectedCategory("");
    setSort("relevance");
    setSearchParams({}, { replace: true });
  };

  const hasFilters = !!selectedCategory || !!debouncedQuery || sort !== "relevance";

  const seoTitle = selectedCategory
    ? `${selectedCategory} – Find verificerede serviceydere`
    : debouncedQuery
    ? `Søgning: ${debouncedQuery} – Serviceydere`
    : "Find serviceydere i Danmark – Søg og sammenlign";
  const seoDesc = selectedCategory
    ? `Find verificerede serviceydere inden for ${selectedCategory} i hele Danmark. Sammenlign priser, læs anmeldelser og book online på Serviceydere.`
    : "Søg blandt verificerede serviceydere i hele Danmark. Sammenlign priser, læs anmeldelser og book online — rengøring, håndværker, flyttehjælp og meget mere.";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDesc}
        canonicalPath={(() => {
          // Dynamisk canonical så filtrerede søgeresultater (kategori/query)
          // kan indekseres som egne sider i Google.
          const params = new URLSearchParams();
          if (selectedCategory) params.set("category", selectedCategory);
          if (debouncedQuery) params.set("q", debouncedQuery);
          const qs = params.toString();
          return qs ? `/virksomheder?${qs}` : "/virksomheder";
        })()}
        keywords={`serviceydere, ${selectedCategory || "find services"}, danmark, sammenlign, book online`}
      />
      {/* Header — matches landing */}
      <SiteNav active="search" />

      {/* Dark hero — søgefeltet ligger nu inde i heroen, så siden starter med
          én tydelig handling i stedet for et felt der svæver over kanten. */}
      <PageHero
        tone="cyan"
        size="compact"
        eyebrow="Find services"
        title="Find verificerede serviceydere."
        subtitle="Søg på service, virksomhed eller by — sammenlign priser og anmeldelser, og book direkte."
      >
        <SearchSuggest variant="page" defaultQuery={debouncedQuery} showNearLabel={false} />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-background/80">
          <LocationChip />
        </div>
      </PageHero>

      {/* Sticky filter bar */}
      <div className="sticky top-14 sm:top-[65px] z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => selectedCategory && handleCategoryClick(selectedCategory)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                selectedCategory
                  ? "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-secondary"
                  : "border-foreground bg-foreground text-background"
              }`}
            >
              Alle brancher
            </button>
            {orderedCategories.map((cat) => {
              // Sammenlign mod kanonisk `key` (det der gemmes på businesses)
              // så chip'en matcher uanset hvordan branchen vises.
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat.key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
                      : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-secondary active:bg-secondary/70"
                  }`}
                >
                  <IndustryIcon category={cat.key} className="h-5 w-5" alt={cat.label} />
                  {cat.label}
                  {active && <X className="h-3 w-3 ml-0.5 opacity-70" />}
                </button>
              );
            })}
          </div>

          {/* Aktive filtre — hvert filter kan fjernes enkeltvis, så man ikke
              behøver rydde alt for at justere én ting. */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 py-2.5 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">Filtre</span>
              {debouncedQuery && (
                <button
                  type="button"
                  onClick={() => setDebouncedQuery("")}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  “{debouncedQuery}” <X className="h-3 w-3 opacity-60" />
                </button>
              )}
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("")}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  {selectedCategory} <X className="h-3 w-3 opacity-60" />
                </button>
              )}
              {sort !== "relevance" && (
                <button
                  type="button"
                  onClick={() => setSort("relevance")}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Sortering <X className="h-3 w-3 opacity-60" />
                </button>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto font-semibold text-accent hover:underline"
              >
                Ryd alle
              </button>
            </div>
          )}
        </div>
      </div>


      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 md:py-7">
        {/* Results header */}
        <h2 className="mb-4 text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-[1.75rem]">
          {selectedCategory
            ? `${selectedCategory} i ${location.city || "Danmark"}`
            : debouncedQuery
              ? `Søgeresultater for "${debouncedQuery}"`
              : "Alle serviceydere"}
        </h2>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {!isLoading && (
              <span>
                <span className="text-base font-bold text-foreground">{businesses?.length || 0}</span>{" "}
                resultat{businesses?.length !== 1 ? "er" : ""}
                {selectedCategory && <> i <span className="font-semibold text-foreground">{selectedCategory}</span></>}
                {debouncedQuery && <> for <span className="font-semibold text-foreground">"{debouncedQuery}"</span></>}
              </span>
            )}
            {hasFilters && (
              <button onClick={clearFilters} className="text-accent hover:underline">
                Ryd filtre
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle: list / map */}
            <div className="inline-flex rounded-full border border-border bg-secondary/60 p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
                  view === "grid" ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground"
                }`}
                aria-pressed={view === "grid"}
              >
                <List className="h-3.5 w-3.5" />
                Liste
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
                  view === "map" ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground"
                }`}
                aria-pressed={view === "map"}
              >
                <MapIcon className="h-3.5 w-3.5" />
                Kort
              </button>
            </div>

            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="h-9 w-[140px] sm:w-[170px] rounded-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevans</SelectItem>
                <SelectItem value="distance" disabled={!userPoint}>
                  Afstand (nærmest)
                </SelectItem>
                <SelectItem value="rating">Bedst bedømte</SelectItem>
                <SelectItem value="newest">Nyeste</SelectItem>
                <SelectItem value="name">Navn (A–Å)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results — list or map */}
        {isLoading ? (
          <CardGridSkeleton count={8} />
        ) : rankedBusinesses && rankedBusinesses.length > 0 ? (
          view === "map" ? (
            <Suspense fallback={<CardGridSkeleton count={4} />}>
              <ResultsMap
                businesses={rankedBusinesses}
                userPoint={userPoint}
                radiusKm={radiusKm}
                highlightedId={highlightedId}
                onMarkerHover={setHighlightedId}
              />
            </Suspense>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {rankedBusinesses.map((biz: any, i: number) => (
                <div key={biz.id} style={{ animation: `fade-in 0.4s ease-out ${Math.min(i, 8) * 50}ms both` }}>
                  <BusinessCard
                    biz={biz}
                    onHover={setHighlightedId}
                    isHighlighted={highlightedId === biz.id}
                  />
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="rounded-[2rem] border border-dashed border-border bg-card px-6 py-14 text-center shadow-sm sm:px-10 sm:py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <SearchIcon className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {hasFilters ? "Ingen virksomheder matcher" : "Ingen virksomheder i denne kategori endnu"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {hasFilters
                ? "Prøv at fjerne et filter, udvide søgeradius — eller få op til 3 tilbud, så finder vi udbydere til dig."
                : "Få op til 3 tilbud i stedet — vi finder udbydere i din region."}
            </p>

            {/* Foreslå populære kategorier som chips — hurtig fallback. */}
            {!debouncedQuery && (
              <div className="mt-6">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Populære brancher
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {CATEGORIES.slice(0, 8).map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-foreground/30"
                    >
                      <IndustryIcon category={cat.key} className="h-4 w-4" alt={cat.label} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              {hasFilters && (
                <Button variant="outline" className="rounded-full" onClick={clearFilters}>
                  Ryd filtre
                </Button>
              )}
              <Link
                to="/tilbud"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-all hover:-translate-y-0.5"
              >
                Få 3 gratis tilbud <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default SearchPage;
