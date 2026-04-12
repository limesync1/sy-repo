import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAllBusinesses } from "@/hooks/useDatabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, ArrowLeft, MapPin, X } from "lucide-react";

const CATEGORIES = [
  "Rengøring", "Håndværker", "Flyttehjælp", "Haveservice",
  "Maler", "VVS", "Elektriker", "Sikkerhed",
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialQuery = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Sync URL params
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
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
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

      <div className="container mx-auto px-4 py-8">
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
            <button
              onClick={clearFilters}
              className="text-sm text-accent hover:underline"
            >
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
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((biz) => (
              <Link key={biz.id} to={`/b/${biz.slug}`}>
                <Card className="h-full border-border transition-all hover:border-foreground/20 hover:shadow-lg">
                  {biz.cover_image_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img src={biz.cover_image_url} alt={biz.name} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-foreground">{biz.name}</h3>
                      {biz.is_verified && <Badge variant="secondary" className="shrink-0">Verificeret</Badge>}
                    </div>
                    {biz.description && (
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{biz.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {biz.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {biz.city}
                        </span>
                      )}
                      {(biz as any).category && <Badge variant="outline">{(biz as any).category}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
