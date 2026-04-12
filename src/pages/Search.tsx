import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAllBusinesses } from "@/hooks/useDatabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, ArrowLeft, MapPin, Star } from "lucide-react";

const CATEGORIES = [
  "Rengøring", "Håndværker", "Flyttehjælp", "Haveservice",
  "Maler", "VVS", "Elektriker", "Sikkerhed",
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const { data: businesses, isLoading } = useAllBusinesses(
    selectedCategory || undefined,
    query || undefined
  );

  const handleCategoryClick = (cat: string) => {
    const newCat = selectedCategory === cat ? "" : cat;
    setSelectedCategory(newCat);
    const params = new URLSearchParams();
    if (newCat) params.set("category", newCat);
    if (query) params.set("q", query);
    setSearchParams(params);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (value) params.set("q", value);
    setSearchParams(params);
  };

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
              <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-8" />
            </Link>
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm" className="border-accent/30 hover:bg-accent/10">Log ind</Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="mx-auto mb-8 max-w-2xl">
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Søg efter virksomhed eller service..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-13 rounded-xl border-accent/20 bg-card pl-11 text-base shadow-sm focus-visible:ring-accent"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <p className="py-12 text-center text-muted-foreground">Søger...</p>
        ) : businesses && businesses.length > 0 ? (
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((biz) => (
              <Link key={biz.id} to={`/b/${biz.slug}`}>
                <Card className="h-full border-border/60 transition-all hover:border-accent/40 hover:shadow-md">
                  {biz.cover_image_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img src={biz.cover_image_url} alt={biz.name} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-lg font-bold text-foreground">{biz.name}</h3>
                      {biz.is_verified && <Badge className="bg-accent/10 text-accent">Verificeret</Badge>}
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
                      {biz.category && <Badge variant="secondary">{biz.category}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">Ingen virksomheder fundet</p>
            <p className="mt-2 text-sm text-muted-foreground">Prøv en anden søgning eller kategori</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
