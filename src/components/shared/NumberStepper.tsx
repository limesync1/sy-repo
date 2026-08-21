import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Kort enhed vist inde i feltet, fx "m²" eller "timer". */
  unit?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Brugervenligt talfelt med −/+ knapper.
 *
 * Løser to klassiske problemer med rå `<input type="number">`:
 *  - Man kunne ikke slette feltet, så et 0 stod tilbage og "2" blev til "02".
 *  - Browserens små pile var svære at ramme (og virkede ikke på touch).
 *
 * Feltet holder en tekstværdi under redigering, så man frit kan slette og
 * skrive; værdien normaliseres (clamp til min/max) når feltet forlades.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  className,
  ariaLabel,
}: NumberStepperProps) {
  const [text, setText] = useState<string>(String(value ?? min));

  // Hold tekstfeltet i sync når værdien ændres udefra (fx reset af formularen).
  useEffect(() => {
    setText((prev) => (Number(prev) === Number(value) ? prev : String(value ?? min)));
  }, [value, min]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commit = (raw: string) => {
    const parsed = parseFloat(raw.replace(",", "."));
    const next = clamp(Number.isFinite(parsed) ? parsed : min);
    // Undgå flydende-komma-støj som 1.7999999999
    const rounded = Math.round(next * 1000) / 1000;
    onChange(rounded);
    setText(String(rounded));
  };

  const bump = (dir: 1 | -1) => {
    const current = Number.isFinite(parseFloat(text)) ? parseFloat(text.replace(",", ".")) : value;
    const next = clamp(Math.round((current + dir * step) * 1000) / 1000);
    onChange(next);
    setText(String(next));
  };

  return (
    <div
      className={cn(
        "inline-flex h-9 items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Færre"
        onClick={() => bump(-1)}
        disabled={value <= min}
        className="flex w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw !== "" && !/^\d*[.,]?\d*$/.test(raw)) return;
          setText(raw);
          const parsed = parseFloat(raw.replace(",", "."));
          if (Number.isFinite(parsed)) onChange(clamp(parsed));
        }}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") { e.preventDefault(); bump(1); }
          if (e.key === "ArrowDown") { e.preventDefault(); bump(-1); }
          if (e.key === "Enter") { e.preventDefault(); commit(text); }
        }}
        className="w-full min-w-0 border-0 bg-transparent px-1 text-center text-sm tabular-nums outline-none"
      />
      {unit && (
        <span className="flex shrink-0 items-center pr-1.5 text-[11px] text-muted-foreground">{unit}</span>
      )}
      <button
        type="button"
        aria-label="Flere"
        onClick={() => bump(1)}
        disabled={value >= max}
        className="flex w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default NumberStepper;
