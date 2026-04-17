import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAllBusinesses, type SortOption } from "@/hooks/useDatabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, ArrowLeft, MapPin, X, Star, Phone, ShieldCheck, SlidersHorizontal } from "lucide-react";

const CATEGORIES = [
  "Rengøring", "Håndværker", "Flyttehjælp", "Haveservice",
  "Maler", "VVS", "Elektriker", "Sikkerhed",
];

const CATEGORY_ICONS: Record<string, string> = {
  "Rengøring": "🧹", "Håndværker": "🔨", "Flyttehjælp": "📦", "Haveservice": "🌿",
  "Maler": "🎨", "VVS": "🔧", "Elektriker": "⚡", "Sikkerhed": "🔒",
};

/* ── Highlight matching text ── */
const highlight = (text: string, tokens: string[]) => {
  if (!tokens.length || !text) return text;
  const pattern = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((p, i) =>
    pattern.test(p) ? <mark key={i} className="rounded bg-accent/20 px-0.5 text-foreground">{p}</mark> : <span key={i}>{p}</span>
  );
};

/* ── Business Card ── */
const BusinessCard = ({ biz, tokens }: { biz: any; tokens: string[] }) => {
  const avgRating = biz._avgRating || 0;
  const reviewCount = biz._reviewCount || 0;

  const categories: string[] = Array.isArray(biz.categories) && biz.categories.length > 0
    ? biz.categories
    : biz.category ? [biz.category] : [];

  return (
    <Link to={`/b/${biz.slug}`} className="group block">
      <Card className="h-full overflow-hidden rounded-xl border-border transition-all group-hover:border-foreground/20 group-hover:shadow-lg">
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-44 w-full shrink-0 overflow-hidden bg-secondary sm:h-auto sm:w-48 md:w-56">
            {biz.cover_image_url ? (
              <img src={biz.cover_image_url} alt={biz.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="flex h-full min-h-[120px] w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                {biz.logo_url ? (
                  <img src={biz.logo_url} alt={biz.name} className="h-14 w-14 rounded-xl object-contain opacity-50" />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground/20">{biz.name.charAt(0)}</span>
                )}
              </div>
            )}
            {biz.is_verified && (
              <Badge className="absolute right-3 top-3 gap-1 border-none bg-background/80 text-foreground backdrop-blur-sm">
                <ShieldCheck className="h-3 w-3 text-accent" /> Verificeret
              </Badge>
            )}
          </div>

          <CardContent className="flex flex-1 flex-col justify-center p-4 sm:p-5">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                {biz.logo_url && (
                  <div className="hidden h-10 w-10 shrink-0 rounded-lg border border-border bg-background sm:flex items-center justify-center">
                    <img src={biz.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                  </div>
                )}
                <h3 className="text-base font-bold text-foreground md:text-lg">{highlight(biz.name, tokens)}</h3>
              </div>
              {reviewCount > 0 && (
                <div className="flex shrink-0 items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviewCount})</span>
                </div>
              )}
            </div>

            {biz.description && (
              <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {highlight(biz.description, tokens)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {biz.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {biz.zip_code ? `${biz.zip_code} ` : ""}{highlight(biz.city, tokens)}
                </span>
              )}
              {biz.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {biz.phone}
                </span>
              )}
            </div>

            {categories.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <span key={cat} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                    <span>{CATEGORY_ICONS[cat] || "📋"}</span>
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
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
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/">
              <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-8" />
            </Link>
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm">Log ind</Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Search bar */}
        <div className="mx-auto mb-5 max-w-2xl">
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Søg på navn, service, by eller postnummer…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-13 rounded-xl border-border bg-card pl-11 pr-10 text-base shadow-sm focus-visible:ring-accent"
              autoFocus
            />
            {inputValue && (
              <button
                onClick={() => { setInputValue(""); setDebouncedQuery(""); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Ryd søgning"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Tip: prøv "rengøring københavn" eller "vvs 8000"
          </p>
        </div>

        {/* Category filters */}
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              {cat}
            </button>
          ))}
        </div>

        {/* Result count + sort */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {!isLoading && (
              <span>
                <span className="font-semibold text-foreground">{businesses?.length || 0}</span>{" "}
                resultat{businesses?.length !== 1 ? "er" : ""}
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
              <SelectTrigger className="h-9 w-[170px] text-sm">
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

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex h-44 animate-pulse overflow-hidden rounded-xl border border-border bg-card">
                <div className="h-full w-48 shrink-0 bg-muted" />
                <div className="flex-1 space-y-3 p-5">
                  <div className="h-5 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-5 w-20 rounded-full bg-muted" />
                    <div className="h-5 w-16 rounded-full bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : businesses && businesses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {businesses.map((biz: any) => (
              <BusinessCard key={biz.id} biz={biz} tokens={tokens} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <SearchIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">Ingen virksomheder fundet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasFilters ? "Prøv en anden søgning eller kategori" : "Der er endnu ingen registrerede virksomheder"}
            </p>
            {hasFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
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
