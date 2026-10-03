import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchAddresses, type AddressSuggestion } from "@/lib/address-suggestions";

export interface AddressValue {
  address: string;
  zip_code: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
}
interface Props {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  onVerified?: (verified: boolean) => void;
  placeholder?: string;
  className?: string;
}
const AddressAutocomplete = ({ value, onChange, onVerified, placeholder, className }: Props) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);
  const listboxId = useId();
  const verified = value.latitude != null && value.longitude != null;
  useEffect(() => {
    const outside = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => { document.removeEventListener("mousedown", outside); revision.current++; if (timer.current) clearTimeout(timer.current); };
  }, []);
  const handleInput = (query: string) => {
    const current = ++revision.current;
    if (timer.current) clearTimeout(timer.current);
    setSuggestions([]); setOpen(false); setError(null); setActiveIdx(-1); setLoading(false);
    onVerified?.(false);
    onChange({ ...value, address: query, latitude: null, longitude: null });
    if (query.trim().length < 4) return;
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchAddresses(query);
        if (current !== revision.current) return;
        setSuggestions(results); setOpen(results.length > 0);
        if (!results.length) setError("Ingen adresse fundet. Tilføj husnummer, postnummer eller by — eller indtast manuelt.");
      } catch (e) {
        if (current === revision.current) setError(e instanceof Error ? e.message : "Adresseforslag kunne ikke hentes.");
      } finally { if (current === revision.current) setLoading(false); }
    }, 650);
  };
  const pick = (s: AddressSuggestion) => {
    revision.current++; if (timer.current) clearTimeout(timer.current);
    setOpen(false); setSuggestions([]); setError(null); setLoading(false); onChange(s); onVerified?.(true);
  };
  return (
    <div ref={wrapRef} className={cn("relative", open && "z-[1000]", className)}>
      <div className="relative">
        <Input value={value.address} onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
            if (!open || !suggestions.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            const selected = suggestions[activeIdx];
            if (e.key === "Enter" && selected) { e.preventDefault(); pick(selected); }
          }}
          placeholder={placeholder || "Begynd at skrive adresse…"} className={cn("h-9 pr-9", verified && "border-accent")}
          autoComplete="off" aria-label="Adresse" role="combobox" aria-autocomplete="list" aria-expanded={open}
          aria-controls={listboxId} aria-activedescendant={activeIdx >= 0 ? `${listboxId}-${activeIdx}` : undefined}
          aria-describedby={error ? `${listboxId}-error` : undefined} />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : verified ? <Check className="h-4 w-4 text-accent" /> : <MapPin className="h-4 w-4" />}
        </span>
      </div>
      {open && suggestions.length > 0 && (
        <ul id={listboxId} role="listbox" className="absolute left-0 top-full z-[1000] mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-xl">
          {suggestions.map((s, i) => (
            <li key={`${s.address}-${s.zip_code}`} id={`${listboxId}-${i}`} role="option" aria-selected={activeIdx === i}>
              <Button type="button" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)} onMouseEnter={() => setActiveIdx(i)}
                className={cn("h-auto min-h-11 w-full justify-start rounded-none px-3 py-2.5 text-left whitespace-normal", activeIdx === i && "bg-secondary")}>
                <MapPin className="shrink-0 text-muted-foreground" /><span><span className="block font-medium">{s.address}</span><span className="block text-xs text-muted-foreground">{s.zip_code} {s.city}</span></span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <p id={`${listboxId}-error`} role="status" className="mt-1.5 text-xs text-destructive">{error}</p>}
      {(value.zip_code || value.city) && <p className="mt-2 text-xs text-muted-foreground">{value.zip_code} {value.city}{verified && " · Verificeret"}</p>}
    </div>
  );
};
export default AddressAutocomplete;
