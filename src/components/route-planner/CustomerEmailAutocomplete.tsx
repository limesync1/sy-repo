import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, User as UserIcon } from "lucide-react";

export interface ExistingCustomer {
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  cvr: string | null;
  company_name: string | null;
}

interface Props {
  businessId: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (customer: ExistingCustomer) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Email-felt med autocomplete over eksisterende kunder fra business' tidligere ordrer.
 * Henter alle unikke (email, navn, adresse, ...) én gang, og filtrerer client-side på email/navn.
 */
const CustomerEmailAutocomplete = ({ businessId, value, onChange, onSelect, placeholder, className }: Props) => {
  const [allCustomers, setAllCustomers] = useState<ExistingCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hent alle kunder for denne business én gang
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("customer_name, customer_email, customer_phone, address, zip_code, city, latitude, longitude, cvr, company_name, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (cancelled) return;
      if (error) {
        console.error("Could not load customer suggestions:", error);
        setLoading(false);
        return;
      }
      // Dedupliker pr. email — behold den nyeste ordre's data
      const seen = new Set<string>();
      const uniq: ExistingCustomer[] = [];
      for (const row of data || []) {
        const key = (row.customer_email || "").toLowerCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        uniq.push({
          customer_name: row.customer_name || "",
          customer_email: key,
          customer_phone: row.customer_phone,
          address: row.address,
          zip_code: row.zip_code,
          city: row.city,
          latitude: row.latitude as number | null,
          longitude: row.longitude as number | null,
          cvr: row.cvr,
          company_name: row.company_name,
        });
      }
      setAllCustomers(uniq);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  // Luk dropdown ved klik udenfor
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const matches = allCustomers.filter(
      (c) =>
        c.customer_email.includes(q) ||
        c.customer_name.toLowerCase().includes(q) ||
        (c.company_name?.toLowerCase().includes(q) ?? false),
    );
    return matches.slice(0, 6);
  }, [allCustomers, value]);

  const showDropdown = open && suggestions.length > 0;

  const handleSelect = (c: ExistingCustomer) => {
    onSelect(c);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        type="email"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showDropdown) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            handleSelect(suggestions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
          {suggestions.map((c, idx) => (
            <button
              key={c.customer_email}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(c);
              }}
              onMouseEnter={() => setHighlight(idx)}
              className={`w-full flex items-start gap-2.5 px-3 py-2 text-left text-xs border-b last:border-b-0 transition-colors ${
                idx === highlight ? "bg-accent/15" : "hover:bg-secondary/50"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{c.company_name || c.customer_name || c.customer_email}</span>
                  {c.company_name && c.customer_name && c.company_name !== c.customer_name && (
                    <span className="text-muted-foreground truncate">· {c.customer_name}</span>
                  )}
                </div>
                <div className="text-muted-foreground truncate">{c.customer_email}</div>
                {(c.address || c.city) && (
                  <div className="text-muted-foreground truncate text-[11px] mt-0.5">
                    {[c.address, [c.zip_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerEmailAutocomplete;