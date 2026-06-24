import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Loader2, Pencil, X, Check, LocateFixed } from "lucide-react";
import { useUserLocation } from "@/contexts/LocationContext";

interface Props {
  /** Compact pill style (default). */
  variant?: "pill" | "inline";
  className?: string;
}

/**
 * Smart location chip.
 *  - Auto-detects via IP — no confirm prompt.
 *  - If detection failed, shows a postal-code input inline.
 *  - User can always click to edit (4-digit DK postal code).
 */
const LocationChip = ({ variant = "pill", className = "" }: Props) => {
  const { location, detecting, detected, setManualZip, detectPreciseLocation } = useUserLocation();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState(location.zip ? `${location.zip}${location.city ? ` ${location.city}` : ""}` : "");
  const [suggestions, setSuggestions] = useState<{ nr: string; navn: string }[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [requestingPrecise, setRequestingPrecise] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // If auto-detection failed (detected but still no location), open the input by default.
  const noLocation = detected && !location.city && !location.zip;
  const showInput = editing || noLocation;

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  useEffect(() => {
    setQuery(location.zip ? `${location.zip}${location.city ? ` ${location.city}` : ""}` : "");
  }, [location.zip]);

  // Autocomplete: try Dataforsyningen's postnumre endpoint with whatever the user
  // typed — digits get matched as postcode, letters as city name. Debounced.
  useEffect(() => {
    const q = query.trim();
    if (!showInput || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api.dataforsyningen.dk/postnumre/autocomplete?q=${encodeURIComponent(q)}&per_side=8`,
          { signal: ctrl.signal, headers: { Accept: "application/json" } },
        );
        if (!r.ok) return;
        const data: { postnummer: { nr: string; navn: string } }[] = await r.json();
        const list = data
          .map((d) => d.postnummer)
          .filter((p, i, arr) => arr.findIndex((x) => x.nr === p.nr) === i)
          .slice(0, 8);
        setSuggestions(list);
        setActiveIdx(0);
      } catch {
        /* network/abort — ignore */
      }
    }, 150);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, showInput]);

  const choose = (zip: string, city: string) => {
    setManualZip(zip, city);
    setQuery(`${zip} ${city}`);
    setSuggestions([]);
    setEditing(false);
  };

  const submit = () => {
    const digits = query.replace(/\D/g, "").slice(0, 4);
    if (suggestions[activeIdx]) {
      choose(suggestions[activeIdx].nr, suggestions[activeIdx].navn);
      return;
    }
    if (/^\d{4}$/.test(digits)) {
      setManualZip(digits);
      setEditing(false);
    }
  };

  const handlePreciseLocation = async () => {
    setRequestingPrecise(true);
    const ok = await detectPreciseLocation();
    if (ok) setEditing(false);
    setRequestingPrecise(false);
  };

  const label = location.city
    ? location.zip
      ? `${location.zip} ${location.city}`
      : location.city
    : location.zip || "";

  const helperLabel = location.source === "precise"
    ? "Præcis placering"
    : location.source === "ip"
      ? "Område baseret på netværk"
      : "Tilpasset manuelt";

  const baseClasses =
    variant === "pill"
      ? "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
      : "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground";

  // Loading state
  if (detecting && !location.city && !location.zip) {
    return (
      <div className={`${baseClasses} ${className}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Finder din lokation…</span>
      </div>
    );
  }

  // Inline editor (failed detection or user clicked edit)
  if (showInput) {
    const digitsOnly = /^\d{4}$/.test(query.replace(/\D/g, "").slice(0, 4));
    const canSubmit = suggestions.length > 0 || digitsOnly;
    return (
      <div className={`relative ${className}`}>
        <div className={`${baseClasses} !py-1 !pr-1`}>
          <MapPin className="h-3.5 w-3.5 text-accent" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                setEditing(false);
                setSuggestions([]);
                setQuery(location.zip ? `${location.zip}${location.city ? ` ${location.city}` : ""}` : "");
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
              }
            }}
            placeholder="By eller postnr."
            className="h-6 w-40 bg-transparent text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Indtast by eller postnummer"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
          />
          <button
            type="button"
            onClick={handlePreciseLocation}
            disabled={requestingPrecise}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            aria-label="Brug min præcise placering"
            title="Brug min præcise placering"
          >
            {requestingPrecise ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30"
            aria-label="Bekræft"
          >
            <Check className="h-3 w-3" />
          </button>
          {(location.city || location.zip) && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setSuggestions([]);
                setQuery(location.zip ? `${location.zip}${location.city ? ` ${location.city}` : ""}` : "");
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Annullér"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-64 w-64 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-[0_18px_45px_-18px_rgba(0,0,0,0.35)]"
          >
            {suggestions.map((s, i) => (
              <li key={s.nr}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s.nr, s.navn);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                    i === activeIdx ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold tabular-nums">{s.nr}</span>
                  <span className="truncate text-muted-foreground">{s.navn}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Display mode
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`${baseClasses} group transition-colors hover:bg-secondary ${className}`}
      title="Klik for at ændre lokation"
    >
      <MapPin className="h-3.5 w-3.5 text-accent" />
      <span className="max-w-[160px] truncate">{label}</span>
      {variant === "pill" && (
        <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
          {helperLabel}
        </span>
      )}
      <Pencil className="h-3 w-3 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
};

export default LocationChip;
