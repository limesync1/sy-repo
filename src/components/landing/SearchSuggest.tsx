import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Building2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/contexts/LocationContext";
import { topCategories, searchIndustries } from "@/lib/service-taxonomy";
import { IndustryIcon } from "@/components/IndustryIcon";

/** Top-brancher hentes fra det kanoniske taksonomi-katalog så landing, søgning
 *  og virksomhedspanelet altid viser præcis de samme brancher. */
const CATEGORIES = topCategories().map((ind) => ({
  label: ind.label,
  key: ind.key,
}));

type Suggestion =
  | { type: "query"; label: string }
  | { type: "category"; label: string; key: string; matchedVia?: string }
  | { type: "business"; label: string; slug: string; city: string | null; logo: string | null }
  | { type: "city"; label: string }
  | { type: "history"; label: string; query: string };

/** Overskrifter pr. forslagstype — bruges til at gruppere dropdownen, så
 *  brugeren hurtigt kan se hvad der er kategori, by og virksomhed. */
const GROUP_LABEL: Record<Suggestion["type"], string> = {
  query: "Fritekst",
  history: "Senest søgt",
  category: "Kategorier",
  city: "Byer",
  business: "Virksomheder",
};


interface Props {
  variant?: "hero" | "page";
  defaultQuery?: string;
  /** Hide the helper "Søger automatisk nær …" line below the input. */
  showNearLabel?: boolean;
  /** Override the input placeholder (defaults to a near-aware string). */
  placeholder?: string;
}

const SearchSuggest = ({ variant = "hero", defaultQuery = "", showNearLabel = true, placeholder }: Props) => {
  const [q, setQ] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { location } = useUserLocation();

  // Senest søgt — lagres lokalt for at give returnerende brugere
  // hurtig adgang til tidligere queries uden at koste backend-opslag.
  const HISTORY_KEY = "sy:recent-searches";
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw).slice(0, 5));
    } catch { /* ignore quota / SSR */ }
  }, []);
  const pushHistory = (term: string) => {
    const t = term.trim();
    if (!t || t.length < 2) return;
    setHistory((prev) => {
      const next = [t, ...prev.filter((p) => p.toLowerCase() !== t.toLowerCase())].slice(0, 5);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  };

  // Fetch a small index of businesses + cities (cached 5 min)
  const { data: index } = useQuery({
    queryKey: ["search-index"],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("name, slug, city, logo_url, categories, category")
        .eq("is_active", true)
        .limit(200);
      const businesses = (data || []).map((b) => ({
        name: b.name,
        slug: b.slug,
        city: b.city,
        logo: b.logo_url,
        cats: (b.categories?.length ? b.categories : (b.category ? [b.category] : [])) as string[],
      }));
      const cities = Array.from(new Set(businesses.map((b) => b.city).filter(Boolean))) as string[];
      return { businesses, cities };
    },
    staleTime: 1000 * 60 * 5,
  });

  const suggestions = useMemo<Suggestion[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) {
      // Empty — senest søgt øverst, derefter top-kategorier
      const recents: Suggestion[] = history.slice(0, 3).map((h) => ({
        type: "history" as const,
        label: h,
        query: h,
      }));
      const cats: Suggestion[] = CATEGORIES.slice(0, 6).map((c) => ({
        type: "category" as const,
        label: c.label,
        key: c.key,
      }));
      return [...recents, ...cats];
    }
    const results: Suggestion[] = [];

    // Branche-match: kig i HELE branchekataloget (alle brancher,
    // underbrancher, service-navne og nøgleord) — så "tagrens",
    // "trappevask", "flytning" osv. også giver kategori-forslag.
    // `preferTopKeys` rangerer top-brancher højst ved tie.
    searchIndustries(term, { limit: 5, preferTopKeys: true }).forEach((hit) =>
      results.push({
        type: "category",
        label: hit.industry.label,
        key: hit.industry.key,
        matchedVia: hit.matchedVia,
      }),
    );

    // City matches
    (index?.cities || [])
      .filter((c) => c.toLowerCase().includes(term))
      .slice(0, 3)
      .forEach((c) => results.push({ type: "city", label: c }));

    // Business matches
    (index?.businesses || [])
      .filter((b) =>
        b.name.toLowerCase().includes(term) ||
        b.cats.some((c) => c.toLowerCase().includes(term))
      )
      .slice(0, 5)
      .forEach((b) => results.push({ type: "business", label: b.name, slug: b.slug, city: b.city, logo: b.logo }));

    return results;
  }, [q, index, history]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const submit = (custom?: string) => {
    const term = (custom ?? q).trim();
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    if (term) pushHistory(term);
    navigate(`/search${params.toString() ? `?${params}` : ""}`);
    setOpen(false);
  };

  const pickSuggestion = (s: Suggestion) => {
    if (s.type === "business") {
      navigate(`/b/${s.slug}`);
    } else if (s.type === "category") {
      pushHistory(s.label);
      navigate(`/search?category=${encodeURIComponent(s.key)}`);
    } else if (s.type === "history") {
      setQ(s.query);
      pushHistory(s.query);
      navigate(`/search?q=${encodeURIComponent(s.query)}`);
    } else {
      pushHistory(s.label);
      navigate(`/search?q=${encodeURIComponent(s.label)}`);
    }
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) pickSuggestion(suggestions[activeIdx]);
      else submit();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const isHero = variant === "hero";
  const nearLabel = location.city
    ? location.zip
      ? `${location.zip} ${location.city}`
      : location.city
    : null;

  return (
    <div ref={wrapRef} className="relative w-full max-w-2xl">
      {/* search-glow tilføjer en blød accent-ring rundt om feltet ved fokus,
          så brugeren får en tydelig (men diskret) bekræftelse på interaktion
          på alle enheder — også touch hvor der ikke er hover. */}
      <div
        className={`search-glow flex items-center overflow-hidden rounded-full border border-border bg-card shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)] ring-1 ring-black/5 transition-all duration-200 ${
          isHero ? "h-14 md:h-16" : "h-12 md:h-14"
        }`}
      >
        <div className="pl-5 pr-2 text-muted-foreground sm:pr-3">
          <Search
            className={`h-5 w-5 transition-all duration-300 ${
              open ? "text-accent scale-105" : ""
            }`}
          />
        </div>
        {/* Vi rendrer to <input> så placeholder kan tilpasses pr. breakpoint
            (HTML har ikke responsive placeholders). Den korte vises kun på
            <sm hvor pladsen er trang og lange tekster bliver klippet. */}
        <input
          type="text"
          placeholder="Søg service eller by…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground sm:hidden"
        />
        <input
          type="text"
          placeholder={placeholder ?? (nearLabel ? `Søg efter service nær ${nearLabel}…` : "Søg efter service, virksomhed eller by…")}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="hidden h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground sm:block"
        />
        <div className="pr-1.5 sm:pr-2">
          <Button
            onClick={() => submit()}
            className="h-10 gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-all duration-200 hover:bg-accent/90 active:scale-[0.97] md:h-11 md:px-6"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Søg</span>
          </Button>
        </div>
      </div>

      {showNearLabel && nearLabel && (
        <div className="mt-2 flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-accent" />
          Søger automatisk nær {nearLabel}
        </div>
      )}

      {/* Suggestions dropdown — animeret enter via keyframe (slide+scale).
          Vi unmount'er bevidst når lukket for at undgå scroll-bleed på mobil
          og holde DOM'en let. */}
      {open && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 origin-top overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5 animate-scale-in"
          role="listbox"
        >
          {!q.trim() && history.length > 0 && (
            <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Senest søgt</span>
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3 w-3" /> Ryd
              </button>
            </div>
          )}
          <ul className="max-h-[min(60vh,460px)] overflow-y-auto overscroll-contain py-1.5">
            {suggestions.map((s, i) => {
              const active = activeIdx === i;
              // Indsæt en sektionsoverskrift før første kategori-forslag
              // når der både er historik og kategorier vist samtidigt.
              const prev = suggestions[i - 1];
              const showCatHeader =
                !q.trim() && s.type === "category" && (!prev || prev.type === "history");
              return (
                <li
                  key={`${s.type}-${s.label}-${i}`}
                  className="animate-fade-in-soft"
                  style={{ animationDelay: `${Math.min(i * 35, 280)}ms` }}
                >
                  {showCatHeader && history.length > 0 && (
                    <div className="mt-1 border-y border-border bg-secondary/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Populære kategorier
                    </div>
                  )}
                  {showCatHeader && history.length === 0 && (
                    <div className="border-b border-border bg-secondary/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Populære kategorier
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => pickSuggestion(s)}
                    className={`group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-150 ${
                      active ? "bg-secondary" : "hover:bg-secondary/60"
                    }`}
                  >
                    {s.type === "history" && (
                      <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-transform duration-200 group-hover:scale-105">
                          <Clock className="h-4 w-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <div className="truncate font-semibold text-foreground">{s.label}</div>
                          <div className="text-xs text-muted-foreground">Senest søgt</div>
                        </span>
                      </>
                    )}
                    {s.type === "category" && (
                      <>
                        <IndustryIcon category={s.key} className="h-8 w-8 shrink-0" alt={s.label} />
                        <span className="flex-1">
                          <div className="font-semibold text-foreground">{s.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.matchedVia ? `Kategori · via "${s.matchedVia}"` : "Kategori"}
                          </div>
                        </span>
                      </>
                    )}
                    {s.type === "city" && (
                      <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition-transform duration-200 group-hover:scale-105">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <span className="flex-1">
                          <div className="font-semibold text-foreground">{s.label}</div>
                          <div className="text-xs text-muted-foreground">By</div>
                        </span>
                      </>
                    )}
                    {s.type === "business" && (
                      <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card transition-transform duration-200 group-hover:scale-105">
                          {s.logo ? (
                            <img
                              src={s.logo}
                              alt=""
                              className="h-full w-full object-contain p-0.5"
                              width={36}
                              height={36}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <div className="truncate font-semibold text-foreground">{s.label}</div>
                          <div className="text-xs text-muted-foreground">
                            Virksomhed{s.city ? ` · ${s.city}` : ""}
                          </div>
                        </span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchSuggest;
