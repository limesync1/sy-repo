import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAllBusinesses, type SortOption } from "@/hooks/useDatabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search as SearchIcon,
  ArrowLeft,
  MapPin,
  X,
  Star,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  Truck,
  TreePine,
  Paintbrush,
  Droplets,
  Zap,
  ShieldCheck as Shield,
} from "lucide-react";

const CATEGORIES = [
  { label: "Rengøring", icon: Sparkles },
  { label: "Håndværker", icon: Wrench },
  { label: "Flyttehjælp", icon: Truck },
  { label: "Haveservice", icon: TreePine },
  { label: "Maler", icon: Paintbrush },
  { label: "VVS", icon: Droplets },
  { label: "Elektriker", icon: Zap },
  { label: "Sikkerhed", icon: Shield },
];

const ICON_BY_LABEL: Record<string, React.ComponentType<{ className?: string }>> = Object.fromEntries(
  CATEGORIES.map((c) => [c.label, c.icon])
);

/* ── Highlight matching text ── */
const highlight = (text: string, tokens: string[]) => {
  if (!tokens.length || !text) return text;
  const pattern = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((p, i) =>
    pattern.test(p) ? <mark key={i} className="rounded bg-accent/20 px-0.5 text-foreground">{p}</mark> : <span key={i}>{p}</span>
  );
};

/* ── Business Card (vertical, matches RecentBusinesses on landing) ── */
const BusinessCard = ({ biz, tokens }: { biz: any; tokens: string[] }) => {
  const avgRating = biz._avgRating || 0;
  const reviewCount = biz._reviewCount || 0;

  const categories: string[] = Array.isArray(biz.categories) && biz.categories.length > 0
    ? biz.categories
    : biz.category ? [biz.category] : [];

  return (
    <Link
      to={`/b/${biz.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-xl"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        {biz.cover_image_url ? (
          <img
            src={biz.cover_image_url}
            alt={biz.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            {biz.logo_url ? (
              <img src={biz.logo_url} alt="" className="h-16 w-16 object-contain opacity-60" />
            ) : (
              <span className="text-4xl font-bold text-muted-foreground/20">{biz.name.charAt(0)}</span>
            )}
          </div>
        )}
        {biz.is_verified && (
          <Badge className="absolute right-3 top-3 gap-1 border-none bg-background/90 text-foreground backdrop-blur-sm">
            <ShieldCheck className="h-3 w-3 text-accent" /> Verificeret
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold tracking-tight text-foreground line-clamp-1">
            {highlight(biz.name, tokens)}
          </h3>
          {reviewCount > 0 && (
            <div className="flex shrink-0 items-center gap-0.5 text-xs">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">({reviewCount})</span>
            </div>
          )}
        </div>

        {biz.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {highlight(biz.description, tokens)}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          {biz.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {biz.zip_code ? `${biz.zip_code} ` : ""}{highlight(biz.city, tokens)}
            </span>
          )}
          {categories[0] && <span className="truncate">{categories[0]}</span>}
        </div>
      </div>
    </Link>
  );
};

/* ── Search Page ── */
const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialQuery = searchParams.get("q") || "";
  const initialSort = (searchParams.get("sort") as SortOption) || "relevance";

  const [inputValue, setInputValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sort, setSort] = useState<SortOption>(initialSort);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(inputValue), 250);
    return () => clearTimeout(timer);
  }, [inputValue]);

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

  const tokens = useMemo(
    () => debouncedQuery.toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean),
    [debouncedQuery]
  );

  const handleCategoryClick = (cat: string) =>
    setSelectedCategory(selectedCategory === cat ? "" : cat);

  const clearFilters = () => {
    setInputValue("");
    setDebouncedQuery("");
    setSelectedCategory("");
    setSort("relevance");
  };

  const hasFilters = !!selectedCategory || !!debouncedQuery || sort !== "relevance";

  return (
    <div className="min-h-screen bg-background">
      {/* Dark hero — compact, editorial, matches landing */}
      <section className="relative overflow-hidden bg-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-[320px] w-[320px] rounded-full bg-accent/[0.06] blur-3xl" />
          <div className="absolute -right-32 -top-10 h-[360px] w-[360px] rounded-full bg-accent/[0.04] blur-3xl" />
        </div>

        <nav className="relative">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link to="/">
                <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-9" />
              </Link>
              <Link to="/" className="hidden items-center gap-1.5 text-sm font-medium text-background/60 transition-colors hover:text-background sm:inline-flex">
                <ArrowLeft className="h-4 w-4" /> Tilbage
              </Link>
            </div>
            <Link to="/auth">
              <Button size="sm" className="bg-background text-foreground font-semibold hover:bg-background/90">
                Log ind
              </Button>
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8 md:pb-14 md:pt-6">
          <div className="grid items-end gap-6 md:grid-cols-[1fr_auto] md:gap-10">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Søg services</p>
              <h1 className="text-3xl font-extrabold leading-[0.95] tracking-tight text-background md:text-5xl">
                Find den rette<br />
                <span className="text-background/60">til opgaven.</span>
              </h1>
            </div>
            <p className="max-w-xs text-sm text-background/60 md:text-right">
              Søg på navn, kategori, by eller postnummer.
            </p>
          </div>

          <div className="relative mt-8 max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="F.eks. 'rengøring københavn' eller 'vvs 8000'"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-13 rounded-xl border-background/10 bg-background pl-12 pr-12 text-base text-foreground shadow-2xl placeholder:text-muted-foreground focus-visible:ring-accent"
              autoFocus
            />
            {inputValue && (
              <button
                onClick={() => { setInputValue(""); setDebouncedQuery(""); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Ryd søgning"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Marquee */}
        <div className="border-t border-background/10 bg-foreground py-3.5">
          <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
            <div className="flex shrink-0 animate-marquee items-center gap-12 pr-12">
              {[...CATEGORIES, ...CATEGORIES, ...CATEGORIES].map((c, i) => (
                <div key={i} className="flex items-center gap-3 whitespace-nowrap text-sm font-medium text-background/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* Category filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => handleCategoryClick(cat.label)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? "border-foreground bg-foreground text-background shadow-md"
                    : "border-border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Result count + sort */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {!isLoading && (
              <span>
                <span className="text-lg font-extrabold tracking-tight text-foreground">{businesses?.length || 0}</span>{" "}
                resultat{businesses?.length !== 1 ? "er" : ""}
                {selectedCategory && <> i <span className="font-semibold text-foreground">{selectedCategory}</span></>}
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

        {/* Results — vertical card grid (3 cols) for cleaner look */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[4/3] w-full bg-muted" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : businesses && businesses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((biz: any, i: number) => (
              <div key={biz.id} style={{ animation: `fade-in 0.4s ease-out ${Math.min(i, 8) * 50}ms both` }}>
                <BusinessCard biz={biz} tokens={tokens} />
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
