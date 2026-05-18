/**
 * AddressAutocomplete — adresse-felt med autoforslag fra DAWA (Danmarks
 * Adresser). Når brugeren skriver "Vester Voldgade 18", vises forslag som
 * "Vester Voldgade 18, 1552 København V". Når et forslag vælges, udfyldes
 * postnr og by automatisk.
 *
 * DAWA er gratis og kræver ingen API-nøgle. Endpoint:
 *   https://api.dataforsyningen.dk/autocomplete?type=adresse&q=...
 */
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Suggestion = {
  tekst: string;
  forslagstekst: string;
  caretpos: number;
  data: {
    id?: string;
    vejnavn?: string;
    husnr?: string;
    etage?: string | null;
    dør?: string | null;
    postnr?: string;
    postnrnavn?: string;
    href?: string;
    // Når valg er en adgangsadresse:
    adgangsadresseid?: string;
  };
  type: string;
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: { address: string; zipCode: string; city: string; lat?: number; lng?: number }) => void;
  placeholder?: string;
  className?: string;
}

const AddressAutocomplete = ({ value, onChange, onSelect, placeholder = "Vejnavn 123, 2100 København Ø", className }: Props) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // userTypedRef sikrer at vi KUN åbner dropdown og henter forslag når
  // brugeren rent faktisk har skrevet i feltet siden mount/sidste pick.
  // Tidligere åbnede `useEffect` på `value` dropdown ved enhver re-render
  // hvor `value` var ikke-tom — fx når parent-komponenten genrenderede
  // under scroll/auto-save.
  const userTypedRef = useRef(false);

  // Luk dropdown ved klik udenfor
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced fetch — triggeres nu KUN fra onChange (eksplicit brugerinput),
  // ikke fra value-prop-ændringer der kommer fra parent re-renders.
  const triggerSearch = (q: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q || q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api.dataforsyningen.dk/autocomplete?type=adresse&q=${encodeURIComponent(q)}&per_side=8&fuzzy=`;
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as Suggestion[];
          setSuggestions(data);
          setOpen(data.length > 0);
          setActiveIdx(-1);
        }
      } catch {
        // stille — brugeren kan altid skrive selv
      } finally {
        setLoading(false);
      }
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const pick = async (s: Suggestion) => {
    userTypedRef.current = false;
    setOpen(false);
    setSuggestions([]);
    const d = s.data || {};
    // Bygger pæn vejnavn + husnr + evt. etage/dør
    const street = [d.vejnavn, d.husnr].filter(Boolean).join(" ");
    const extras = [d.etage && `${d.etage}.`, d.dør].filter(Boolean).join(" ");
    const fullStreet = extras ? `${street}, ${extras}` : street;
    onChange(fullStreet);

    // Hvis det var en fuld adresse — hent koordinater også
    let lat: number | undefined;
    let lng: number | undefined;
    if (d.id || d.adgangsadresseid) {
      try {
        const id = d.id || d.adgangsadresseid;
        const r = await fetch(`https://api.dataforsyningen.dk/adgangsadresser/${id}`);
        if (r.ok) {
          const a = await r.json();
          if (Array.isArray(a?.adgangspunkt?.koordinater)) {
            lng = Number(a.adgangspunkt.koordinater[0]);
            lat = Number(a.adgangspunkt.koordinater[1]);
          }
        }
      } catch { /* stille */ }
    }

    onSelect({
      address: fullStreet,
      zipCode: d.postnr || "",
      city: d.postnrnavn || "",
      lat,
      lng,
    });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      pick(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            userTypedRef.current = true;
            onChange(next);
            triggerSearch(next);
          }}
          onFocus={() => {
            // Åbn KUN hvis brugeren faktisk har skrevet siden sidste pick —
            // ikke fordi et re-render fokuserer feltet ved scroll/auto-save.
            if (userTypedRef.current && suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="bg-card h-10 rounded-lg pl-9 pr-9"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border border-border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <button
              key={(s.data?.id || s.tekst) + i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                i === activeIdx
                  ? "bg-secondary text-foreground"
                  : "text-foreground hover:bg-secondary/60",
              )}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{s.tekst}</p>
                {s.data?.postnr && s.data?.postnrnavn && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {s.data.postnr} {s.data.postnrnavn}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="mt-1 text-[11px] text-muted-foreground">
        Skriv vejnavn — postnummer og by udfyldes automatisk.
      </p>
    </div>
  );
};

export default AddressAutocomplete;