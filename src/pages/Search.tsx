import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAllBusinesses, type SortOption } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchSuggest from "@/components/landing/SearchSuggest";
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
  Heart,
  Building2,
  Hammer,
} from "lucide-react";

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

/* Business card — same look as landing */
const BusinessCard = ({ biz }: { biz: any }) => {
  const [liked, setLiked] = useState(false);
  const cats: string[] = Array.isArray(biz.categories) && biz.categories.length > 0
    ? biz.categories
    : biz.category ? [biz.category] : [];
  const primaryCat = cats[0];
  const extra = cats.length - 1;
  const avg = biz._avgRating || 0;
  const cnt = biz._reviewCount || 0;

  return (
    <Link to={`/b/${biz.slug}`} className="group flex flex-col gap-3">
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

        <button
          onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
          className="absolute right-3 top-3 transition-transform hover:scale-110"
          aria-label="Gem"
        >
          <Heart className={`h-7 w-7 stroke-[2] drop-shadow-md ${liked ? "fill-accent text-accent" : "fill-foreground/30 text-white"}`} />
        </button>

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
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground line-clamp-1">{biz.name}</h3>
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

  // Sync URL params -> state when they change externally (e.g. from suggestions)
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

  const handleCategoryClick = (cat: string) =>
    setSelectedCategory(selectedCategory === cat ? "" : cat);

  const clearFilters = () => {
    setDebouncedQuery("");
    setSelectedCategory("");
    setSort("relevance");
    setSearchParams({}, { replace: true });
  };

  const hasFilters = !!selectedCategory || !!debouncedQuery || sort !== "relevance";

  return (
    <div className="min-h-screen bg-background">
      {/* Header — matches landing */}
      <nav className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3.5">
            <Link to="/" className="flex items-center" aria-label="Serviceydere">
              <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-9 md:h-10" />
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <Link to="/search" className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground">Find services</Link>
              <Link to="/quote" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">Få tilbud</Link>
              <Link to="/auth?role=business" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">Bliv udbyder</Link>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <button className="rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">Log ind</button>
              </Link>
              <Link to="/auth?signup=1" className="hidden sm:inline-block">
                <button className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90">Opret konto</button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Compact search hero */}
      <section className="border-b border-border bg-secondary/40 py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Find verificerede serviceydere
          </h1>
          <p className="mb-5 text-sm text-muted-foreground">Søg på service, virksomhed eller by.</p>
          <SearchSuggest variant="page" defaultQuery={debouncedQuery} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Category chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => handleCategoryClick(cat.label)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
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
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="h-9 w-[170px] rounded-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevans</SelectItem>
                <SelectItem value="rating">Bedst bedømte</SelectItem>
                <SelectItem value="newest">Nyeste</SelectItem>
                <SelectItem value="name">Navn (A–Å)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results grid */}
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
        ) : businesses && businesses.length > 0 ? (
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {businesses.map((biz: any, i: number) => (
              <div key={biz.id} style={{ animation: `fade-in 0.4s ease-out ${Math.min(i, 8) * 50}ms both` }}>
                <BusinessCard biz={biz} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
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
