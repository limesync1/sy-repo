import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAllBusinesses, type SortOption } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchSuggest from "@/components/landing/SearchSuggest";
import FavoriteButton from "@/components/business/FavoriteButton";
import LocationChip from "@/components/LocationChip";
import RadiusPicker from "@/components/RadiusPicker";
import { useUserLocation } from "@/contexts/LocationContext";
import { distanceBetweenZipsKm, lookupDkZip, haversineKm } from "@/lib/dk-postcodes";
import SEO from "@/components/SEO";
import {
  Search as SearchIcon,
  MapPin,
  Star,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  Truck,
  TreePine,
  Paintbrush,
  Droplets,
  Zap,
  Building2,
  Hammer,
  X,
  Navigation,
  Map as MapIcon,
  List,
  Phone,
  ArrowRight,
} from "lucide-react";
import ResultsMap from "@/components/search/ResultsMap";
import SiteNav from "@/components/SiteNav";

const CATEGORIES = [
  { label: "Rengøring", icon: Sparkles },
  { label: "Håndværker", icon: Wrench },
  { label: "Flyttehjælp", icon: Truck },
  { label: "Haveservice", icon: TreePine },
  { label: "Maler", icon: Paintbrush },
  { label: "VVS", icon: Droplets },
  { label: "Elektriker", icon: Zap },
  { label: "Tømrer", icon: Hammer },
  { label: "Sikkerhed", icon: ShieldCheck },
];

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
      className={`group relative flex flex-col gap-3 rounded-2xl p-2 -m-2 transition-all ${
        isHighlighted ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-secondary">
        {biz.cover_image_url ? (
          <img
            src={biz.cover_image_url}
            alt={biz.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <Building2 className="h-14 w-14 text-muted-foreground/30" />
          </div>
        )}

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
          <div className="absolute -bottom-5 left-4 h-14 w-14 overflow-hidden rounded-xl border-2 border-card bg-card shadow-md flex items-center justify-center">
            <img src={biz.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-1 px-1 ${biz.logo_url ? "pt-4" : ""}`}>
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
        <div className="mt-2 flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
        canonicalPath="/virksomheder"
        keywords={`serviceydere, ${selectedCategory || "find services"}, danmark, sammenlign, book online`}
      />
      {/* Header — matches landing */}
      <SiteNav active="search" />

      {/* Search hero — full-width search */}
      <section className="border-b border-border bg-background py-8 md:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="surface-panel rounded-[2rem] border border-border p-6 text-center shadow-[0_24px_55px_-36px_hsl(var(--foreground)/0.26)] md:p-8">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Find verificerede serviceydere
          </h1>
          <p className="mb-5 text-sm text-muted-foreground md:text-base">Søg på service, virksomhed eller by, og få et hurtigere overblik over relevante virksomheder nær dig.</p>
          <div className="mx-auto flex justify-center">
            <SearchSuggest variant="hero" defaultQuery={debouncedQuery} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Viser nær:</span>
            <LocationChip />
            <RadiusPicker />
          </div>
          </div>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-14 sm:top-[65px] z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => handleCategoryClick(cat.label)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
                      : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-secondary active:bg-secondary/70"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                  {active && <X className="h-3 w-3 ml-0.5 opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Results header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-card p-4 shadow-sm">
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
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] w-full rounded-2xl bg-muted" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : rankedBusinesses && rankedBusinesses.length > 0 ? (
          view === "map" ? (
            <ResultsMap
              businesses={rankedBusinesses}
              userPoint={userPoint}
              radiusKm={radiusKm}
              highlightedId={highlightedId}
              onMarkerHover={setHighlightedId}
            />
          ) : (
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <div className="rounded-[2rem] border border-dashed border-border bg-card py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <SearchIcon className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-bold tracking-tight text-foreground">Ingen virksomheder fundet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {hasFilters ? "Prøv en anden søgning eller fjern et filter for at se flere resultater." : "Der er endnu ingen registrerede virksomheder i denne kategori."}
            </p>
            {hasFilters && (
              <Button variant="outline" className="mt-5 rounded-full" onClick={clearFilters}>
                Ryd filtre
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
