import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { ImageIcon, ShoppingCart, Minus, Plus } from "lucide-react";
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
    <div className="flex items-center gap-0">
      <button type="button" onClick={dec} disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30">
        <Minus className="h-3.5 w-3.5" />
      </button>
      {isLargeRange ? (
        <input type="number" value={value}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
          min={min} max={max} step={step}
          className="flex h-9 w-[5rem] items-center border-y border-border bg-card px-2 text-center text-sm font-semibold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <div className="flex h-9 min-w-[4rem] items-center justify-center border-y border-border bg-card px-2 text-sm font-semibold text-foreground">
          {value}
        </div>
      )}
      <button type="button" onClick={inc} disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30">
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
      initial[s.id] = initialStepValues?.[s.id] ?? 0;
    });
    return initial;
  });

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
    const stepDetails: { label: string; value: number; unit: string; price_per_unit: number; subtotal: number }[] = [];

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
    toast.success(`${service.name} tilføjet til bestilling`);
  };

  const total = calculateTotal();
  const intervals = service.interval_options && service.interval_options.length > 0
    ? service.interval_options : ["engangskøb"];
  const showIntervals = intervals.length > 1 || (intervals.length === 1 && intervals[0] !== "engangskøb");

  return (
    <Card className="overflow-hidden border-border transition-all hover:shadow-md">
      {service.image_url ? (
        <div className="relative h-44 w-full overflow-hidden bg-secondary md:h-52">
          <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" loading="lazy" />
          <Badge variant="outline" className="absolute right-3 top-3 border-background/50 bg-background/80 backdrop-blur-sm text-xs">
            {pricingLabels[service.pricing_type]}
          </Badge>
        </div>
      ) : (
        <div className="relative flex h-28 w-full items-center justify-center bg-secondary/40">
          <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
          <Badge variant="outline" className="absolute right-3 top-3 text-xs">
            {pricingLabels[service.pricing_type]}
          </Badge>
        </div>
      )}

      <CardContent className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground">{service.name}</h3>
          {(service as any).subcategory && (
            <span className="text-xs font-medium text-accent">{(service as any).subcategory}</span>
          )}
          {service.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
          )}
        </div>

        {/* Fast pris */}
        {service.pricing_type === "fast_pris" && (
          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{service.base_price}</span>
            <span className="text-sm text-muted-foreground">kr</span>
          </div>
        )}

        {/* Timepris */}
        {service.pricing_type === "timepris" && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{service.base_price} kr / time</span>
              <StepperInput value={hours} onChange={setHours} min={0.5} max={24} step={0.5} unit="t" />
            </div>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-2xl font-bold text-foreground">{total}</span>
              <span className="text-sm text-muted-foreground">kr</span>
            </div>
          </div>
        )}

        {/* Prisberegner */}
        {service.pricing_type === "prisberegner" && sortedSteps.length > 0 && (
          <div className="mb-4 space-y-0 rounded-xl border border-border overflow-hidden">
            {sortedSteps.map((step, idx) => {
              const stepTotal = (stepValues[step.id] || 0) * step.price_per_unit;
              return (
                <div key={step.id} className={`px-4 py-3 ${idx !== sortedSteps.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">{step.label}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">({step.price_per_unit} kr/{step.unit})</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">{stepTotal} kr</span>
                  </div>
                  <StepperInput
                    value={stepValues[step.id] ?? 0}
                    onChange={(v) => setStepValues((prev) => ({ ...prev, [step.id]: v }))}
                    min={0} max={step.max_value || 100} unit={step.unit}
                  />
                </div>
              );
            })}
            <div className="flex items-center justify-between bg-secondary/40 px-4 py-3">
              <span className="text-sm font-semibold text-foreground">I alt</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">{total}</span>
                <span className="text-sm text-muted-foreground">kr</span>
              </div>
            </div>
          </div>
        )}

        {/* Interval selector */}
        {showIntervals && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vælg interval</label>
            <div className="flex flex-wrap gap-1.5">
              {intervals.map((iv) => (
                <button key={iv} type="button" onClick={() => setSelectedInterval(iv)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedInterval === iv
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-accent/40"
                  }`}>
                  {INTERVAL_LABELS[iv] || iv}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleAdd} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <ShoppingCart className="h-4 w-4" />
          Tilføj til bestilling – {total} kr
        </Button>
      </CardContent>
    </Card>
  );
};

export default DynamicServiceCard;
