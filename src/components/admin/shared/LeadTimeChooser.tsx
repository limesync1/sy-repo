import { useEffect, useState } from "react";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumberStepper } from "@/components/shared/NumberStepper";

export const LEAD_PRESETS = [
  { v: 60, label: "1 time" },
  { v: 120, label: "2 timer" },
  { v: 240, label: "4 timer" },
  { v: 1440, label: "1 dag" },
  { v: 2880, label: "2 dage" },
] as const;

type Unit = "min" | "t" | "d";
const UNIT_MIN: Record<Unit, number> = { min: 1, t: 60, d: 1440 };
const UNIT_LABEL: Record<Unit, string> = { min: "minutter", t: "timer", d: "dage" };
const MAX_MIN = 14 * 1440;

/** «90» → «1 time og 30 min.» — læsevenlig dansk tekst. */
export function formatLeadTime(mins: number): string {
  if (mins <= 0) return "ved ankomst";
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  const parts = [d && `${d} ${d === 1 ? "dag" : "dage"}`, h && `${h} ${h === 1 ? "time" : "timer"}`, m && `${m} min.`].filter(Boolean) as string[];
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}` : parts[0];
}
const bestUnit = (mins: number): Unit => (mins % 1440 === 0 ? "d" : mins % 60 === 0 ? "t" : "min");

interface Props {
  value: number | null;
  onChange: (mins: number | null) => void;
  /** Vis «Som standard» (arv fra virksomheden). Bruges på kunde/aftale. */
  inheritLabel?: string;
  compact?: boolean;
}

/**
 * Vælg hvor længe før besøget påmindelsen sendes: hurtigvalg + «Brugerdefineret»
 * med tal og enhed. Viser altid en klar sætning om, hvornår den sendes.
 */
export function LeadTimeChooser({ value, onChange, inheritLabel, compact }: Props) {
  const isPreset = value != null && LEAD_PRESETS.some((p) => p.v === value);
  const [customOpen, setCustomOpen] = useState(value != null && !isPreset);
  const [unit, setUnit] = useState<Unit>(value != null ? bestUnit(value) : "t");
  const [amount, setAmount] = useState<number>(value != null ? value / UNIT_MIN[bestUnit(value)] : 3);

  useEffect(() => {
    if (value != null && !LEAD_PRESETS.some((p) => p.v === value)) {
      setCustomOpen(true); const u = bestUnit(value); setUnit(u); setAmount(value / UNIT_MIN[u]);
    }
  }, [value]);

  const applyCustom = (a: number, u: Unit) => {
    const mins = Math.min(MAX_MIN, Math.max(15, Math.round(a * UNIT_MIN[u])));
    onChange(mins);
  };

  const chip = (active: boolean) => cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors sm:min-h-10",
    active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-foreground hover:border-accent/50 hover:bg-accent/5",
  );

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Hvor længe før besøget">
        {inheritLabel && (
          <button type="button" role="radio" aria-checked={value == null} onClick={() => { setCustomOpen(false); onChange(null); }} className={chip(value == null)}>
            {value == null && <Check className="h-3.5 w-3.5" />}{inheritLabel}
          </button>
        )}
        {LEAD_PRESETS.map((p) => {
          const active = value === p.v && !customOpen;
          return (
            <button key={p.v} type="button" role="radio" aria-checked={active} onClick={() => { setCustomOpen(false); onChange(p.v); }} className={chip(active)}>
              {active && <Check className="h-3.5 w-3.5" />}{p.label}
            </button>
          );
        })}
        <button type="button" role="radio" aria-checked={customOpen}
          onClick={() => { setCustomOpen(true); applyCustom(amount, unit); }} className={chip(customOpen)}>
          {customOpen && <Check className="h-3.5 w-3.5" />}Brugerdefineret
        </button>
      </div>

      {customOpen && (
        <div className="flex flex-col gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 sm:flex-row sm:items-center">
          <NumberStepper value={amount} min={unit === "min" ? 15 : 1} max={unit === "d" ? 14 : unit === "t" ? 336 : 1440} step={unit === "min" ? 15 : 1}
            ariaLabel="Antal" onChange={(v) => { setAmount(v); applyCustom(v, unit); }} className="h-11 w-full sm:h-10 sm:w-36" />
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5" role="radiogroup" aria-label="Enhed">
            {(["min", "t", "d"] as Unit[]).map((u) => (
              <button key={u} type="button" role="radio" aria-checked={unit === u}
                onClick={() => { const a = Math.max(1, Math.round((amount * UNIT_MIN[unit]) / UNIT_MIN[u])); setUnit(u); setAmount(a); applyCustom(a, u); }}
                className={cn("min-h-10 flex-1 rounded-md px-3 text-sm font-medium transition-colors", unit === u ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                {UNIT_LABEL[u]}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">før besøget</span>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-sm text-foreground">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        {value == null
          ? <span>Bruger virksomhedens standard.</span>
          : <span>Sendes <strong>{formatLeadTime(value)}</strong> før den planlagte ankomst.</span>}
      </p>
    </div>
  );
}

export default LeadTimeChooser;
