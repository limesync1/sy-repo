import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, ChevronDown, Loader2, MapPin, Search } from "lucide-react";
import { IndustryIcon } from "@/components/IndustryIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ALL_INDUSTRIES, searchIndustries, topCategories, type Industry } from "@/lib/service-taxonomy";

interface PostalSuggestion {
  nr: string;
  navn: string;
}

type CategoryRow = {
  industry: Industry;
  matchedVia?: string;
  group?: string;
};

interface Props {
  /** Forudvalgt service (kan stadig ændres af brugeren). */
  defaultService?: string;
  /** Overskrift over widgeten. */
  heading?: string;
  /** Underoverskrift. */
  description?: string;
  /** Mørk variant (dark hero / footer-baggrund). */
  tone?: "light" | "dark";
}

/**
 * Lokal "find hjælp" widget — service + by → /tilbud med prefill.
 * Bruges på hub-sider, blog-/guides-index og forsiden for at sænke friktion
 * og koble SEO-trafik direkte til konverteringsflowet.
 */
const LocalQuoteWidget = ({
  defaultService = "Rengøring",
  heading = "Find lokal hjælp nu",
  description = "Søg service og skriv by eller postnummer — vi finder 3 verificerede udbydere i dit område.",
  tone = "light",
}: Props) => {
  const navigate = useNavigate();
  const [service, setService] = useState(() => (
    ALL_INDUSTRIES.some((item) => item.key === defaultService) ? defaultService : "Rengøring"
  ));
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<PostalSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<PostalSuggestion | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [activeLocationIdx, setActiveLocationIdx] = useState(0);
  const locationInputRef = useRef<HTMLInputElement>(null);

  const popularKeys = useMemo(() => topCategories().map((c) => c.key), []);
  const selectedService = useMemo(
    () => ALL_INDUSTRIES.find((item) => item.key === service) || ALL_INDUSTRIES[0],
    [service],
  );

  const categoryRows = useMemo<CategoryRow[]>(() => {
    const query = serviceQuery.trim();
    if (query) {
      return searchIndustries(query, { limit: 60, preferTopKeys: true }).map((hit) => ({
        industry: hit.industry,
        matchedVia: hit.matchedVia,
      }));
    }

    const popular = popularKeys
      .map((key) => ALL_INDUSTRIES.find((item) => item.key === key))
      .filter(Boolean) as Industry[];
    const rest = [...ALL_INDUSTRIES]
      .filter((item) => !popularKeys.includes(item.key))
      .sort((a, b) => a.label.localeCompare(b.label, "da"));

    return [
      ...popular.map((industry, index) => ({
        industry,
        group: index === 0 ? "Populære" : undefined,
      })),
      ...rest.map((industry, index) => ({
        industry,
        group: index === 0 ? "Alle services" : undefined,
      })),
    ];
  }, [popularKeys, serviceQuery]);

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }

    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocationLoading(true);
      try {
        const response = await fetch(
          `https://api.dataforsyningen.dk/postnumre/autocomplete?q=${encodeURIComponent(query)}&per_side=8`,
          { signal: ctrl.signal, headers: { Accept: "application/json" } },
        );
        if (!response.ok) return;
        const data: { postnummer: PostalSuggestion }[] = await response.json();
        const list = data
          .map((item) => item.postnummer)
          .filter((item, index, all) => all.findIndex((candidate) => candidate.nr === item.nr) === index)
          .slice(0, 8);
        setLocationSuggestions(list);
        setActiveLocationIdx(0);
      } catch {
        // Autocomplete er en hjælp — fri tekst virker stadig hvis API'et fejler.
      } finally {
        setLocationLoading(false);
      }
    }, 160);

    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [locationQuery]);

  const chooseLocation = (suggestion: PostalSuggestion) => {
    setSelectedLocation(suggestion);
    setLocationQuery(`${suggestion.nr} ${suggestion.navn}`);
    setLocationSuggestions([]);
    locationInputRef.current?.blur();
  };

  const handleLocationKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && locationSuggestions.length > 0) {
      event.preventDefault();
      setActiveLocationIdx((index) => Math.min(index + 1, locationSuggestions.length - 1));
    } else if (event.key === "ArrowUp" && locationSuggestions.length > 0) {
      event.preventDefault();
      setActiveLocationIdx((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && locationSuggestions[activeLocationIdx]) {
      event.preventDefault();
      chooseLocation(locationSuggestions[activeLocationIdx]);
    } else if (event.key === "Escape") {
      setLocationSuggestions([]);
      locationInputRef.current?.blur();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (service) params.set("category", service);

    const rawLocation = locationQuery.trim();
    const selectedLabel = selectedLocation ? `${selectedLocation.nr} ${selectedLocation.navn}` : "";
    const zip = selectedLocation && rawLocation === selectedLabel
      ? selectedLocation.nr
      : rawLocation.match(/\b\d{4}\b/)?.[0] || "";
    const city = selectedLocation && rawLocation === selectedLabel
      ? selectedLocation.navn
      : rawLocation.replace(/\b\d{4}\b/g, "").replace(/,/g, " ").replace(/\s+/g, " ").trim();

    if (zip) params.set("postal", zip);
    if (city) params.set("city", city);

    if (!city && !zip && rawLocation) {
      params.set("city", rawLocation);
    }

    navigate(`/tilbud${params.toString() ? `?${params}` : ""}`);
  };

  const dark = tone === "dark";
  const wrap = dark
    ? "border-background/15 bg-background/5 text-background"
    : "border-border bg-card text-foreground";
  const label = dark ? "text-background/70" : "text-muted-foreground";
  const field = dark
    ? "border-background/20 bg-background/10 text-background placeholder:text-background/50 focus:ring-background/40"
    : "border-input bg-background text-foreground focus:ring-ring";
  const popoverPanel = dark
    ? "border-background/15 bg-[hsl(var(--hero-bg))] text-background"
    : "border-border bg-card text-foreground";
  const hoverRow = dark ? "hover:bg-background/10" : "hover:bg-secondary/60";
  const activeRow = dark ? "bg-background/10 text-background" : "bg-secondary text-foreground";
  const button = dark
    ? "bg-background text-foreground hover:bg-background/90"
    : "bg-foreground text-background hover:opacity-90";

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Find lokal serviceyder"
      className={`not-prose rounded-2xl border p-5 shadow-panel sm:p-6 ${wrap}`}
    >
      <div className="mb-4">
        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${label}`}>
          Gratis & uforpligtende
        </p>
        <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{heading}</p>
        <p className={`mt-1 text-sm leading-6 ${label}`}>{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.25fr_1.1fr_auto]">
        <label className="flex flex-col gap-1">
          <span className={`text-xs font-medium ${label}`}>Service</span>
          <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex h-12 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm focus:outline-none focus:ring-2 ${field}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/70 ring-1 ring-border">
                    <IndustryIcon category={selectedService.key} className="h-6 w-6" alt={selectedService.label} />
                  </span>
                  <span className="truncate font-medium">{selectedService.label}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              className={`w-[var(--radix-popover-trigger-width)] rounded-2xl p-0 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.32)] ${popoverPanel}`}
            >
              <div className="flex items-center gap-2 border-b border-current/10 px-3 py-2">
                <Search className="h-4 w-4 opacity-65" />
                <input
                  autoFocus
                  value={serviceQuery}
                  onChange={(event) => setServiceQuery(event.target.value)}
                  placeholder="Søg alle services…"
                  className="h-8 w-full bg-transparent text-sm outline-none placeholder:opacity-60"
                />
              </div>
              <ul className="max-h-80 overflow-y-auto py-1">
                {categoryRows.length === 0 && (
                  <li className="px-4 py-3 text-sm opacity-70">Ingen services matcher.</li>
                )}
                {categoryRows.map(({ industry, matchedVia, group }) => {
                  const active = industry.key === service;
                  return (
                    <li key={industry.key}>
                      {group && (
                        <div className="sticky top-0 z-[1] border-b border-current/10 bg-secondary/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {group}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setService(industry.key);
                          setServiceOpen(false);
                          setServiceQuery("");
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${active ? activeRow : hoverRow}`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/70 ring-1 ring-border">
                          <IndustryIcon category={industry.key} className="h-7 w-7" alt={industry.label} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{industry.label}</span>
                          {matchedVia && <span className="block truncate text-[11px] opacity-65">via {matchedVia}</span>}
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
        </label>
        <label className="flex flex-col gap-1">
          <span className={`text-xs font-medium ${label}`}>By eller postnr.</span>
          <span className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-65" />
            <input
              ref={locationInputRef}
              value={locationQuery}
              onChange={(event) => {
                setLocationQuery(event.target.value);
                setSelectedLocation(null);
              }}
              onKeyDown={handleLocationKeyDown}
              placeholder="Skriv fx 8000 eller Aarhus"
              autoComplete="off"
              className={`h-12 w-full rounded-xl border pl-9 pr-9 text-sm focus:outline-none focus:ring-2 ${field}`}
              aria-autocomplete="list"
              aria-expanded={locationSuggestions.length > 0}
            />
            {locationLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin opacity-65" />
            )}
            {locationSuggestions.length > 0 && (
              <ul
                role="listbox"
                className={`absolute left-0 top-[calc(100%+6px)] z-50 max-h-64 w-full overflow-y-auto rounded-xl border py-1 shadow-[0_18px_45px_-18px_rgba(0,0,0,0.35)] ${popoverPanel}`}
              >
                {locationSuggestions.map((suggestion, index) => (
                  <li key={suggestion.nr}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        chooseLocation(suggestion);
                      }}
                      onMouseEnter={() => setActiveLocationIdx(index)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${index === activeLocationIdx ? activeRow : hoverRow}`}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 opacity-65" />
                      <span className="font-semibold tabular-nums">{suggestion.nr}</span>
                      <span className="truncate opacity-75">{suggestion.navn}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </span>
        </label>
        <button
          type="submit"
          className={`mt-auto inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold sm:col-span-2 lg:col-span-1 lg:w-auto ${button}`}
        >
          Få 3 tilbud →
        </button>
      </div>
      <p className={`mt-3 text-[11px] ${label}`}>
        Svar på under 24 timer · CVR-verificerede firmaer · Ingen forpligtelse
      </p>
    </form>
  );
};

export default LocalQuoteWidget;