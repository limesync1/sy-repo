import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DAWA-baseret adresse-autocomplete (gratis, ingen nøgle).
 * Når en adresse vælges, returneres alle felter inkl. lat/lng.
 * Bruges i bestillings-formularer for hurtig + verificeret indtastning.
 */
export interface AddressValue {
  address: string;
  zip_code: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface DawaSuggestion {
  tekst: string;
  forslagstekst: string;
  type: string;
  data: {
    vejnavn?: string;
    husnr?: string;
    etage?: string;
    dør?: string;
    postnr?: string;
    postnrnavn?: string;
    x?: number; // longitude
    y?: number; // latitude
    id?: string;
  };
}

interface Props {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  onVerified?: (verified: boolean) => void;
  placeholder?: string;
  className?: string;
}

const AddressAutocomplete = ({ value, onChange, onVerified, placeholder, className }: Props) => {
  const [query, setQuery] = useState(value.address || "");
  const [suggestions, setSuggestions] = useState<DawaSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(!!(value.latitude && value.longitude));
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Hold query in sync if parent resets value
  useEffect(() => { setQuery(value.address || ""); setVerified(!!(value.latitude && value.longitude)); }, [value.address, value.latitude, value.longitude]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const search = (q: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q || q.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        // DAWA "autocomplete" — fuzzy + tolerant, returnerer adgangsadresser med koordinater
        // type=adgangsadresse → kun komplette adresser med vejnavn + husnr + postnr (ingen "tomme" forslag)
        const url = `https://api.dataforsyningen.dk/autocomplete?q=${encodeURIComponent(q)}&type=adgangsadresse&caretpos=${q.length}&fuzzy=&per_side=8`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          // Filtrér uberørte suggestions uden husnr (typen "vejnavn") så vi aldrig viser "undefined undefined"
          const list = Array.isArray(data) ? data : [];
          const usable = list.filter((s: DawaSuggestion) => s?.data?.vejnavn && s?.data?.husnr && s?.data?.postnr);
          setSuggestions(usable);
          setOpen(true);
          setActiveIdx(-1);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 220);
  };

  const handleInput = (q: string) => {
    setQuery(q);
    setVerified(false);
    onVerified?.(false);
    onChange({ ...value, address: q, latitude: null, longitude: null });
    search(q);
  };

  const pick = (s: DawaSuggestion) => {
    const d = s.data;
    if (!d.vejnavn || !d.husnr) return; // safety net
    const street = `${d.vejnavn} ${d.husnr}${d.etage ? ", " + d.etage + "." : ""}${d.dør ? " " + d.dør : ""}`.trim();
    setQuery(street);
    setOpen(false);
    setSuggestions([]);
    setVerified(true);
    onVerified?.(true);
    onChange({
      address: street,
      zip_code: d.postnr || "",
      city: d.postnrnavn || "",
      latitude: d.y ?? null,
      longitude: d.x ?? null,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); pick(suggestions[activeIdx]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || "Begynd at skrive adresse…"}
          className="h-9 pr-9"
          autoComplete="off"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : verified ? <Check className="h-3.5 w-3.5 text-accent" />
            : <MapPin className="h-3.5 w-3.5" />}
        </span>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          <ul className="max-h-72 overflow-y-auto py-1 text-sm">
            {suggestions.map((s, i) => (
              <li key={(s.data.id || s.tekst) + i}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
                    activeIdx === i ? "bg-accent/10" : "hover:bg-accent/5"
                  )}
                >
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 leading-tight">
                    <span className="block font-medium text-foreground">
                      {s.data.vejnavn} {s.data.husnr}
                      {s.data.etage ? `, ${s.data.etage}.` : ""}{s.data.dør ? ` ${s.data.dør}` : ""}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {s.data.postnr || ""} {s.data.postnrnavn || ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;