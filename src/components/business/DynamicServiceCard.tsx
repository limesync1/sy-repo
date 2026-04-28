import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { ImageIcon, ShoppingCart, Minus, Plus, Check } from "lucide-react";
import { INTERVAL_LABELS } from "@/types/service";
import type { Service, CalculatorStep } from "@/hooks/useDatabase";
import { buildPricingSnapshot, roundPrice } from "@/lib/service-pricing";

interface Props {
  service: Service & { calculator_steps?: CalculatorStep[] };
  initialStepValues?: Record<string, number>;
  initialHours?: number;
  businessName?: string;
  businessLogoUrl?: string;
}

const getSmartStep = (unit: string, min: number, max: number): number => {
  const range = max - min;
  if (["m²", "m2", "m"].includes(unit)) {
    if (range >= 500) return 10;
    if (range >= 100) return 5;
    return 1;
  }
  if (["km"].includes(unit)) return range >= 50 ? 5 : 1;
  if (["timer"].includes(unit)) return 0.5;
  if (["kr"].includes(unit)) {
    if (range >= 5000) return 500;
    if (range >= 1000) return 100;
    return 50;
  }
  return 1;
};

const StepperInput = ({
  value, onChange, min, max, step: stepOverride, unit,
}: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit: string;
}) => {
  const step = stepOverride ?? getSmartStep(unit, min, max);
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));
  const isLargeRange = (max - min) > 20;

  return (
    <div className="inline-flex items-center gap-0">
      <button type="button" onClick={dec} disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-r-0 border-border bg-card text-foreground transition-colors hover:bg-secondary active:bg-secondary/70 disabled:opacity-30 disabled:hover:bg-card">
        <Minus className="h-3.5 w-3.5" />
      </button>
      {isLargeRange ? (
        <input type="number" value={value}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
          min={min} max={max} step={step}
          className="flex h-9 w-[5rem] items-center border-y border-border bg-card px-2 text-center text-sm font-semibold text-foreground outline-none focus:bg-background [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <div className="flex h-9 min-w-[3rem] items-center justify-center border-y border-border bg-card px-2 text-sm font-semibold text-foreground">
          {value}
        </div>
      )}
      <button type="button" onClick={inc} disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-l-0 border-border bg-card text-foreground transition-colors hover:bg-secondary active:bg-secondary/70 disabled:opacity-30 disabled:hover:bg-card">
        <Plus className="h-3.5 w-3.5" />
      </button>
      <span className="ml-2 text-xs text-muted-foreground">{unit}</span>
    </div>
  );
};

const DynamicServiceCard = ({ service, initialStepValues, initialHours, businessName, businessLogoUrl }: Props) => {
  const { addItem } = useCart();
  const [hours, setHours] = useState(initialHours ?? 1);
  const [selectedInterval, setSelectedInterval] = useState(
    (service.interval_options && service.interval_options.length > 0) ? service.interval_options[0] : "engangskøb"
  );
  const [stepValues, setStepValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    service.calculator_steps?.forEach((s) => {
      initial[s.id] = initialStepValues?.[s.id] ?? s.default_value ?? s.min_value ?? 0;
    });
    return initial;
  });
  const [justAdded, setJustAdded] = useState(false);

  const pricingLabels: Record<string, string> = {
    fast_pris: "Fast pris", timepris: "Timepris", prisberegner: "Prisberegner",
  };

  const sortedSteps = [...(service.calculator_steps || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const calculateTotal = (): number => {
    if (service.pricing_type === "fast_pris") return service.base_price || 0;
    if (service.pricing_type === "timepris") return (service.base_price || 0) * hours;
    if (service.pricing_type === "prisberegner") {
      return (service.calculator_steps || []).reduce((total, step) => {
        const val = stepValues[step.id] || 0;
        return total + val * step.price_per_unit;
      }, 0);
    }
    return 0;
  };

  const handleAdd = () => {
    const total = roundPrice(calculateTotal());
    let details = "";
    const stepDetails: {
      id?: string;
      label: string;
      value: number;
      unit: string;
      price_per_unit: number;
      subtotal: number;
      min_value?: number;
      max_value?: number;
      default_value?: number;
      sort_order?: number;
    }[] = [];

    if (service.pricing_type === "fast_pris") {
      details = "Fast pris";
    } else if (service.pricing_type === "timepris") {
      details = `${hours} timer`;
      stepDetails.push({
        id: "hours",
        label: "Timer",
        value: hours,
        unit: "timer",
        price_per_unit: service.base_price || 0,
        subtotal: total,
        min_value: 0.5,
        max_value: 24,
        default_value: hours,
        sort_order: 0,
      });
    } else {
      const parts: string[] = [];
      sortedSteps.forEach((s) => {
        const val = stepValues[s.id] || 0;
        parts.push(`${s.label}: ${val} ${s.unit}`);
        stepDetails.push({
          id: s.id,
          label: s.label,
          value: val,
          unit: s.unit,
          price_per_unit: s.price_per_unit,
          subtotal: roundPrice(val * s.price_per_unit),
          min_value: s.min_value ?? 0,
          max_value: s.max_value ?? 100,
          default_value: s.default_value ?? 0,
          sort_order: s.sort_order ?? 0,
        });
      });
      details = parts.join(", ");
    }

    addItem({
      serviceId: service.id,
      serviceName: service.name,
      total,
      details,
      quantity: 1,
      interval: selectedInterval,
      businessId: service.business_id,
      businessName,
      businessLogoUrl: businessLogoUrl || undefined,
      stepDetails,
      pricingSnapshot: buildPricingSnapshot({ ...service, calculator_steps: sortedSteps }),
    });

    setJustAdded(true);
    toast.success(`${service.name} tilføjet til bestilling`);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const total = calculateTotal();
  const intervals = service.interval_options && service.interval_options.length > 0
    ? service.interval_options : ["engangskøb"];
  const showIntervals = intervals.length > 1 || (intervals.length === 1 && intervals[0] !== "engangskøb");

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border-border/80 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-[0_24px_55px_-34px_hsl(var(--foreground)/0.24)]">
      {/* Image or placeholder */}
      {service.image_url ? (
        <div className="relative h-36 w-full overflow-hidden bg-secondary sm:h-40">
          <img
            src={service.image_url}
            alt={service.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ) : (
        <div className="relative flex h-20 w-full items-center justify-center bg-secondary/70 sm:h-24">
          <ImageIcon className="h-8 w-8 text-muted-foreground/15" />
        </div>
      )}

      <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
          <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight text-foreground">{service.name}</h3>
          {(service as any).subcategory && (
            <span className="mt-1 inline-flex rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">{(service as any).subcategory}</span>
          )}
          {service.description && (
            <p className="mt-2 text-sm leading-5 text-muted-foreground/90 line-clamp-2">{service.description}</p>
          )}
          </div>
        </div>

        <div className="mt-4 space-y-4">
        {showIntervals && (
          <div className="rounded-[1.25rem] border border-border bg-secondary/30 p-3.5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Abonnement / interval</label>
            <div className="flex flex-wrap gap-1.5">
              {intervals.map((iv) => (
                <button key={iv} type="button" onClick={() => setSelectedInterval(iv)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedInterval === iv
                      ? "border-accent bg-accent text-accent-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-accent/40"
                  }`}>
                  {INTERVAL_LABELS[iv] || iv}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[1.5rem] border border-border bg-secondary/20 p-3.5 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tilpas service</p>
              <p className="text-sm text-muted-foreground">Vælg omfang og se prisen opdatere med det samme.</p>
            </div>
          </div>

        {/* Fast pris */}
        {service.pricing_type === "fast_pris" && (
          <div className="inline-flex w-fit items-end gap-1.5 rounded-2xl bg-card px-3 py-2 ring-1 ring-border">
            <span className="text-[1.75rem] font-bold text-foreground">{service.base_price}</span>
            <span className="pb-1 text-sm text-muted-foreground">kr</span>
          </div>
        )}

        {/* Timepris */}
        {service.pricing_type === "timepris" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">{service.base_price} kr / time</span>
              <StepperInput value={hours} onChange={setHours} min={0.5} max={24} step={0.5} unit="t" />
            </div>
            <div className="inline-flex items-end gap-1.5 rounded-2xl bg-card px-3 py-2 pt-2 ring-1 ring-border">
              <span className="text-[1.75rem] font-bold text-foreground">{roundPrice(total)}</span>
              <span className="pb-1 text-sm text-muted-foreground">kr</span>
            </div>
          </div>
        )}

        {/* Prisberegner */}
        {service.pricing_type === "prisberegner" && sortedSteps.length > 0 && (
          <div className="space-y-0 overflow-hidden rounded-2xl border border-border bg-card">
            {sortedSteps.map((step, idx) => {
              const stepTotal = (stepValues[step.id] || 0) * step.price_per_unit;
              return (
                <div key={step.id} className={`px-3 py-3 sm:px-4 ${idx !== sortedSteps.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">{step.label}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">({step.price_per_unit} kr/{step.unit})</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">{roundPrice(stepTotal)} kr</span>
                  </div>
                  <StepperInput
                    value={stepValues[step.id] ?? step.default_value ?? step.min_value ?? 0}
                    onChange={(v) => setStepValues((prev) => ({ ...prev, [step.id]: v }))}
                    min={step.min_value ?? 0}
                    max={step.max_value || 100}
                    unit={step.unit}
                  />
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-accent/20 bg-accent/5 px-3 py-3 sm:px-4">
              <span className="text-sm font-semibold text-foreground">I alt</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">{roundPrice(total)}</span>
                <span className="text-sm text-muted-foreground">kr</span>
              </div>
            </div>
          </div>
        )}
        </div>

        <div className="rounded-[1.5rem] border border-accent/20 bg-[hsl(var(--accent)/0.06)] p-3.5 shadow-[0_18px_40px_-32px_hsl(var(--foreground)/0.45)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prisoverslag</p>
              <div className="mt-1 flex items-end gap-1.5">
                <p className="text-2xl font-bold leading-none text-foreground">{roundPrice(total)}</p>
                <span className="text-sm text-muted-foreground">kr</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedInterval && selectedInterval !== "engangskøb"
                  ? INTERVAL_LABELS[selectedInterval] || selectedInterval
                  : "Engangsservice"}
              </p>
            </div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/15 bg-background text-accent shadow-sm">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            disabled={justAdded}
            className={`h-12 w-full gap-2 rounded-xl text-sm font-semibold transition-all ${
              justAdded
                ? "bg-accent/80 text-accent-foreground"
                : "bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 hover:shadow-xl hover:shadow-accent/35 active:scale-[0.98]"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4" />
                Tilføjet!
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Tilføj til bestilling
              </>
            )}
          </Button>
        </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default DynamicServiceCard;
