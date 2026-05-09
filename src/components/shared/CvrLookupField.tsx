import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CvrResult {
  cvr: string;
  name: string;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onResult?: (r: CvrResult | null) => void;
  className?: string;
}

/**
 * CVR-felt med "Slå op" knap. Bruger cvrapi.dk via edge function.
 * Når et resultat findes, kaldes onResult med firmaoplysninger der
 * kan auto-udfylde resten af formularen (navn, adresse, telefon).
 */
const CvrLookupField = ({ value, onChange, onResult, className }: Props) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "notfound" | "service_down" | "error">("idle");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");

  const cleaned = (value || "").replace(/\D/g, "");
  const isValid = cleaned.length === 8;

  const lookup = async () => {
    if (!isValid) return;
    setLoading(true);
    setStatus("idle");
    try {
      const { data, error } = await supabase.functions.invoke("cvr-lookup", { body: { cvr: cleaned } });
      if (error) {
        // Edge function svarede ikke — typisk netværk eller midlertidigt nede.
        setStatus("service_down");
        return;
      }
      if (data?.found) {
        setStatus("ok");
        setCompanyName(data.name);
        onResult?.(data as CvrResult);
      } else if (data?.reason === "service_down") {
        setStatus("service_down");
        setCompanyName(null);
        onResult?.(null);
      } else {
        setStatus("notfound");
        setCompanyName(null);
        onResult?.(null);
      }
    } catch {
      setStatus("service_down");
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (v: string) => {
    onChange(v);
    if (status !== "idle") { setStatus("idle"); setCompanyName(null); setManualName(""); }
  };

  const submitManual = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setCompanyName(trimmed);
    onResult?.({
      cvr: cleaned,
      name: trimmed,
      address: null,
      zip_code: null,
      city: null,
      phone: null,
      email: null,
    });
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(); } }}
            placeholder="8 cifre — fx 12345678"
            inputMode="numeric"
            maxLength={11}
            className="h-9 pl-8"
          />
          <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={lookup}
          disabled={!isValid || loading}
          className="h-9 shrink-0"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Slå op"}
        </Button>
      </div>
      {status === "ok" && companyName && (
        <span className="inline-flex items-center gap-1.5 text-xs text-accent rounded-md bg-accent/10 border border-accent/20 px-2 py-1">
          <Check className="h-3 w-3" /> {companyName}
        </span>
      )}
      {status === "notfound" && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground rounded-md bg-secondary px-2 py-1">
          <AlertCircle className="h-3 w-3" /> Intet CVR-nummer fundet
        </span>
      )}
      {(status === "error" || status === "service_down") && (
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-destructive rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1">
            <AlertCircle className="h-3 w-3" /> CVR-tjenesten er midlertidigt nede — indtast firmanavn manuelt
          </span>
          <div className="flex gap-2">
            <Input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitManual(manualName); } }}
              placeholder="Firmanavn"
              className="h-9"
            />
            <Button type="button" size="sm" onClick={() => submitManual(manualName)} disabled={manualName.trim().length < 2} className="h-9 shrink-0">
              Fortsæt
            </Button>
          </div>
          {companyName && (
            <span className="inline-flex items-center gap-1.5 text-xs text-accent rounded-md bg-accent/10 border border-accent/20 px-2 py-1">
              <Check className="h-3 w-3" /> {companyName} (manuelt indtastet)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CvrLookupField;