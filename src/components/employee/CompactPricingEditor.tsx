// Kompakt prisredigering til medarbejderen: samme prismodeller som
// virksomhedspanelet (fast pris, timepris, prisberegner) + interval.
// Prisen her er et overslag; serveren regner den endelige pris.
import { NumberStepper } from "@/components/shared/NumberStepper";
import { INTERVAL_LABELS } from "@/types/service";
import { formatPrice } from "@/lib/price-format";
import { getSmartStep } from "@/lib/service-pricing";
import { cn } from "@/lib/utils";

export type CalcStep = { id: string; label: string; unit: string | null; price_per_unit: number; min_value: number | null; max_value: number | null; default_value: number | null; sort_order: number | null };
export type PricedService = { id: string; name: string; unit: string | null; pricing_type: "fast_pris" | "timepris" | "prisberegner"; base_price: number | null; interval_options: string[] | null; calculator_steps?: CalcStep[] };

export type PricingState = { quantity: number; unitPrice: number; hours: number; steps: Record<string, number>; interval: string };

export const intervalOptionsFor = (s: PricedService, current?: string) => {
  const base = s.interval_options?.length ? s.interval_options : ["engangskøb"];
  return Array.from(new Set([...(current ? [current] : []), ...base]));
};

export const sortedSteps = (s: PricedService) =>
  [...(s.calculator_steps || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

export const defaultPricing = (s: PricedService): PricingState => ({
  quantity: 1,
  unitPrice: Number(s.base_price || 0),
  hours: 1,
  steps: Object.fromEntries(sortedSteps(s).map((st) => [st.id, Number(st.default_value ?? st.min_value ?? 0)])),
  interval: intervalOptionsFor(s)[0],
});

export const estimateTotal = (s: PricedService, p: PricingState) => {
  if (s.pricing_type === "timepris") return p.unitPrice * p.hours;
  if (s.pricing_type === "prisberegner") {
    const unit = sortedSteps(s).reduce((t, st) => t + (p.steps[st.id] ?? 0) * Number(st.price_per_unit || 0), 0);
    return unit * p.quantity;
  }
  return p.unitPrice * p.quantity;
};

export const toPricingPayload = (s: PricedService, p: PricingState) => ({
  quantity: s.pricing_type === "timepris" ? p.hours : p.quantity,
  pricing: {
    interval: p.interval,
    ...(s.pricing_type === "timepris" ? { hours: p.hours, unit_price: p.unitPrice } : {}),
    ...(s.pricing_type === "fast_pris" ? { unit_price: p.unitPrice } : {}),
    ...(s.pricing_type === "prisberegner" ? { steps: p.steps } : {}),
  },
});

const TYPE_LABEL = { fast_pris: "Fast pris", timepris: "Timepris", prisberegner: "Prisberegner" } as const;

export function CompactPricingEditor({ service, value, onChange, currentInterval }: {
  service: PricedService; value: PricingState; onChange: (p: PricingState) => void; currentInterval?: string;
}) {
  const set = (patch: Partial<PricingState>) => onChange({ ...value, ...patch });
  const intervals = intervalOptionsFor(service, currentInterval);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{TYPE_LABEL[service.pricing_type]}</span>
        <span className="text-sm font-semibold tabular-nums">{formatPrice(estimateTotal(service, value))}</span>
      </div>

      {service.pricing_type === "fast_pris" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-[11px] text-muted-foreground">Antal
            <NumberStepper value={value.quantity} min={1} max={999} onChange={(n) => set({ quantity: n })} className="h-11 w-full" ariaLabel="Antal" />
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">Pris pr. stk
            <NumberStepper value={value.unitPrice} min={0} max={1000000} step={50} unit="kr" onChange={(n) => set({ unitPrice: n })} className="h-11 w-full" ariaLabel="Pris" />
          </label>
        </div>
      )}

      {service.pricing_type === "timepris" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-[11px] text-muted-foreground">Timer
            <NumberStepper value={value.hours} min={0.5} max={24} step={0.5} unit="t" onChange={(n) => set({ hours: n })} className="h-11 w-full" ariaLabel="Timer" />
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">Timepris
            <NumberStepper value={value.unitPrice} min={0} max={100000} step={25} unit="kr" onChange={(n) => set({ unitPrice: n })} className="h-11 w-full" ariaLabel="Timepris" />
          </label>
        </div>
      )}

      {service.pricing_type === "prisberegner" && (
        <div className="space-y-2">
          {sortedSteps(service).length === 0 && <p className="text-[12px] text-muted-foreground">Prisberegneren har ingen trin.</p>}
          {sortedSteps(service).map((st) => {
            const min = Number(st.min_value ?? 0), max = Number(st.max_value ?? 100000), unit = st.unit || service.unit || "stk";
            return (
              <div key={st.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{st.label}</p>
                  <p className="text-[11px] text-muted-foreground">{formatPrice(st.price_per_unit)} pr. {unit}</p>
                </div>
                <NumberStepper value={value.steps[st.id] ?? min} min={min} max={max} step={getSmartStep(unit, min, max)} unit={unit}
                  onChange={(n) => set({ steps: { ...value.steps, [st.id]: n } })} className="h-11 w-36 shrink-0" ariaLabel={st.label} />
              </div>
            );
          })}
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[11px] text-muted-foreground">Interval</p>
        <div className="flex flex-wrap gap-1.5">
          {intervals.map((iv) => (
            <button key={iv} type="button" onClick={() => set({ interval: iv })} aria-pressed={value.interval === iv}
              className={cn("min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
                value.interval === iv ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground")}>
              {INTERVAL_LABELS[iv] || iv}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
