import { useEffect, useRef, useState } from "react";
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
  const [zipInput, setZipInput] = useState(location.zip || "");
  const [requestingPrecise, setRequestingPrecise] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // If auto-detection failed (detected but still no location), open the input by default.
  const noLocation = detected && !location.city && !location.zip;
  const showInput = editing || noLocation;

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  useEffect(() => {
    setZipInput(location.zip || "");
  }, [location.zip]);

  const submit = () => {
    if (/^\d{4}$/.test(zipInput.trim())) {
      setManualZip(zipInput.trim());
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
    return (
      <div className={`${baseClasses} !py-1 !pr-1 ${className}`}>
        <MapPin className="h-3.5 w-3.5 text-accent" />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={zipInput}
          onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              setEditing(false);
              setZipInput(location.zip || "");
            }
          }}
          placeholder="Postnr."
          className="h-6 w-16 bg-transparent text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Indtast postnummer"
        />
        <button
          type="button"
          onClick={handlePreciseLocation}
          disabled={requestingPrecise}
          className="flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          aria-label="Brug min præcise placering"
        >
          {requestingPrecise ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
          GPS
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!/^\d{4}$/.test(zipInput.trim())}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30"
          aria-label="Bekræft postnummer"
        >
          <Check className="h-3 w-3" />
        </button>
        {(location.city || location.zip) && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setZipInput(location.zip || "");
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Annullér"
          >
            <X className="h-3 w-3" />
          </button>
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
