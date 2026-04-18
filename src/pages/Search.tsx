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

/* ── Business Card ── */
const BusinessCard = ({ biz, tokens }: { biz: any; tokens: string[] }) => {
  const avgRating = biz._avgRating || 0;
  const reviewCount = biz._reviewCount || 0;

  const categories: string[] = Array.isArray(biz.categories) && biz.categories.length > 0
    ? biz.categories
    : biz.category ? [biz.category] : [];

  return (
    <Link to={`/b/${biz.slug}`} className="group block">
      <Card className="h-full overflow-hidden rounded-2xl border-border transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-foreground/20 group-hover:shadow-xl">
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-44 w-full shrink-0 overflow-hidden bg-secondary sm:h-auto sm:w-48 md:w-56">
            {biz.cover_image_url ? (
              <img src={biz.cover_image_url} alt={biz.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
              <Badge className="absolute right-3 top-3 gap-1 border-none bg-background/90 text-foreground backdrop-blur-sm">
                <ShieldCheck className="h-3 w-3 text-accent" /> Verificeret
              </Badge>
            )}
          </div>

          <CardContent className="flex flex-1 flex-col justify-center p-5">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                {biz.logo_url && (
                  <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background sm:flex">
                    <img src={biz.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                  </div>
                )}
                <h3 className="text-base font-bold tracking-tight text-foreground md:text-lg">{highlight(biz.name, tokens)}</h3>
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
                {categories.map((cat) => {
                  const Icon = ICON_BY_LABEL[cat];
                  return (
                    <span key={cat} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                      {Icon && <Icon className="h-3 w-3" />}
                      {cat}
                    </span>
                  );
                })}
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
      {/* Dark hero banner — matches landing page */}
      <section className="relative overflow-hidden bg-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-[320px] w-[320px] rounded-full bg-accent/[0.06] blur-3xl" />
          <div className="absolute -right-32 -top-10 h-[360px] w-[360px] rounded-full bg-accent/[0.04] blur-3xl" />
        </div>

        <nav className="relative">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 text-background/70 transition-colors hover:text-background">
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden text-sm font-medium sm:inline">Tilbage</span>
              </Link>
              <Link to="/" className="ml-3">
                <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-9" />
              </Link>
            </div>
            <Link to="/auth">
              <Button size="sm" className="bg-background text-foreground font-semibold hover:bg-background/90">
                Log ind
              </Button>
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-6 text-center md:pb-16 md:pt-10 md:px-8">
          <h1 className="mb-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-background md:text-5xl">
            Find <span className="text-accent">serviceydere</span>
          </h1>
          <p className="mb-8 text-base text-background/60 md:text-lg">
            Søg på navn, kategori, by eller postnummer
          </p>

          <div className="relative mx-auto max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="F.eks. 'rengøring københavn' eller 'vvs 8000'"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-14 rounded-2xl border-background/10 bg-background pl-12 pr-12 text-base text-foreground shadow-2xl placeholder:text-muted-foreground focus-visible:ring-accent"
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

      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {/* Category filters */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
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

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex h-44 animate-pulse overflow-hidden rounded-2xl border border-border bg-card">
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
