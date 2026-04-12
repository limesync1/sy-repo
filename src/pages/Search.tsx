import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAllBusinesses, useReviews } from "@/hooks/useDatabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, ArrowLeft, MapPin, X, Star, Phone, ShieldCheck } from "lucide-react";

const CATEGORIES = [
  "Rengøring", "Håndværker", "Flyttehjælp", "Haveservice",
  "Maler", "VVS", "Elektriker", "Sikkerhed",
];

/* ── Business Card with rating ── */
const BusinessCard = ({ biz }: { biz: any }) => {
  const { data: reviews } = useReviews(biz.id);
  const avgRating = reviews?.length ? (reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length) : null;

  return (
    <Link to={`/b/${biz.slug}`} className="group block">
      <Card className="h-full overflow-hidden border-border transition-all group-hover:border-foreground/20 group-hover:shadow-lg">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
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

          {/* Content */}
          <CardContent className="flex flex-1 flex-col justify-center p-4 sm:p-5">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                {biz.logo_url && (
                  <div className="hidden h-10 w-10 shrink-0 rounded-lg border border-border bg-background sm:flex items-center justify-center">
                    <img src={biz.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                  </div>
                )}
                <h3 className="text-base font-bold text-foreground md:text-lg">{biz.name}</h3>
              </div>
              {avgRating !== null && (
                <div className="flex shrink-0 items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviews?.length})</span>
                </div>
              )}
            </div>

            {biz.description && (
              <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{biz.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {biz.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {biz.city}
                </span>
              )}
              {biz.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {biz.phone}
                </span>
              )}
              {biz.category && <Badge variant="outline" className="text-xs">{biz.category}</Badge>}
            </div>
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

  const [inputValue, setInputValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (debouncedQuery) params.set("q", debouncedQuery);
    setSearchParams(params, { replace: true });
  }, [selectedCategory, debouncedQuery, setSearchParams]);

  const { data: businesses, isLoading } = useAllBusinesses(
    selectedCategory || undefined,
    debouncedQuery || undefined
  );

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(selectedCategory === cat ? "" : cat);
  };

  const clearFilters = () => {
    setInputValue("");
    setDebouncedQuery("");
    setSelectedCategory("");
  };

  const hasFilters = !!selectedCategory || !!debouncedQuery;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        <div className="mx-auto mb-6 max-w-2xl">
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Søg efter virksomhed, service eller by..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-13 rounded-xl border-border bg-card pl-11 pr-10 text-base shadow-sm focus-visible:ring-accent"
              autoFocus
            />
            {inputValue && (
              <button
                onClick={() => { setInputValue(""); setDebouncedQuery(""); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category filters */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Active filters */}
        {hasFilters && (
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">
              {businesses?.length || 0} resultat{businesses?.length !== 1 ? "er" : ""}
            </span>
            <button onClick={clearFilters} className="text-sm text-accent hover:underline">
              Ryd filtre
            </button>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          </div>
        ) : businesses && businesses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {businesses.map((biz) => (
              <BusinessCard key={biz.id} biz={biz} />
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
