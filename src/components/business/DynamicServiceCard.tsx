import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { ShoppingCart, Minus, Plus, Check } from "lucide-react";
import { INTERVAL_LABELS } from "@/types/service";
import type { Service, CalculatorStep } from "@/hooks/useDatabase";
import { buildPricingSnapshot, roundPrice } from "@/lib/service-pricing";
import { hueForString } from "@/lib/industry-color";

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
      details = "Specifik pris";
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

  const isFixed = service.pricing_type === "fast_pris";

  // Kuløren bruges kun som diskret branche-signal (billed-badge og
  // underkategori-chip). Alt interaktivt bruger brandets accent-token, så
  // farverne er forudsigelige og knapperne ser ens ud på tværs af kort.
  const hue = hueForString((service as any).subcategory || (service as any).category || service.name);
  const priceLabel = `${roundPrice(total).toLocaleString("da-DK")} kr`;
  const intervalLabel = selectedInterval && selectedInterval !== "engangskøb"
    ? INTERVAL_LABELS[selectedInterval] || selectedInterval
    : "engangskøb";

  return (
    <Card
      style={{ ["--ind" as string]: `${hue}` }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border-border/80 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.35)] focus-within:ring-2 focus-within:ring-accent/40 focus-within:ring-offset-2 focus-within:ring-offset-background"
    >
      {/* Billede: fast 16:9-felt med skarp beskæring i midten — ensartet
          korthøjde og ingen blurrede kanter. */}
      {service.image_url ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
          <img
            src={service.image_url}
            alt={`${service.name}${businessName ? ` hos ${businessName}` : ""}`}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
            width={640}
            height={360}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/45 to-transparent" />
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur ${
              isFixed
                ? "bg-foreground text-background"
                : "bg-card/90 text-foreground ring-1 ring-border"
            }`}
          >
            {isFixed ? "Fast pris" : "Prisoverslag"}
          </span>
        </div>
      ) : (
        <div
          aria-hidden
          className="relative aspect-[16/6] w-full bg-[linear-gradient(135deg,hsl(var(--ind)_60%_95%),hsl(var(--ind)_45%_88%))]"
        >
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              isFixed ? "bg-foreground text-background" : "bg-card text-foreground ring-1 ring-border"
            }`}
          >
            {isFixed ? "Fast pris" : "Prisoverslag"}
          </span>
        </div>
      )}

      <CardContent className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="border-b border-border/70 pb-2.5">
          <h3 className="text-[15px] font-bold leading-tight text-foreground sm:text-base">{service.name}</h3>
          {(service as any).subcategory && (
            <span className="mt-1.5 inline-flex rounded-full bg-[hsl(var(--ind)_55%_95%)] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--ind)_55%_25%)] ring-1 ring-[hsl(var(--ind)_45%_45%_/_0.2)]">{(service as any).subcategory}</span>
          )}
          {service.description && (
            <p className="mt-1.5 text-xs leading-snug text-muted-foreground line-clamp-2">{service.description}</p>
          )}
          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
            {isFixed
              ? "Prisen er fast — læg direkte i bestillingen."
              : "Justér felterne nedenfor — prisen beregnes automatisk."}
          </p>
        </div>





        <div className="mt-2 space-y-2">
        {showIntervals && (
          <div className="rounded-lg border border-border bg-secondary/30 p-2">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Interval</label>
            <div className="flex flex-wrap gap-1">
              {intervals.map((iv) => (
                <button key={iv} type="button" onClick={() => setSelectedInterval(iv)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all ${
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

        <div className="rounded-lg border border-border bg-secondary/20 p-2">
          {!isFixed && (
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tilpas opgaven — prisen opdateres automatisk
            </p>
          )}


        {/* Fast pris */}
        {service.pricing_type === "fast_pris" && (
          <div className="inline-flex w-fit items-end gap-1 rounded-lg bg-card px-2.5 py-1.5 ring-1 ring-border">
            <span className="text-xl font-bold text-foreground">{service.base_price}</span>
            <span className="pb-0.5 text-xs text-muted-foreground">kr</span>
          </div>
        )}

        {/* Timepris */}
        {service.pricing_type === "timepris" && (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">{service.base_price} kr / time</span>
              <StepperInput value={hours} onChange={setHours} min={0.5} max={24} step={0.5} unit="t" />
            </div>
          </div>
        )}

        {/* Prisberegner */}
        {service.pricing_type === "prisberegner" && sortedSteps.length > 0 && (
          <div className="space-y-0 overflow-hidden rounded-lg border border-border bg-card">
            {sortedSteps.map((step, idx) => {
              const stepTotal = (stepValues[step.id] || 0) * step.price_per_unit;
              return (
                <div key={step.id} className={`px-2 py-1.5 ${idx !== sortedSteps.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-foreground">{step.label}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">({step.price_per_unit} kr/{step.unit})</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground shrink-0">{roundPrice(stepTotal)} kr</span>
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
          </div>
        )}
        </div>

        <div className="mt-auto rounded-xl border border-[hsl(var(--ind)_70%_45%_/_0.3)] bg-[hsl(var(--ind)_75%_96%)] p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {isFixed ? "Fast pris" : "Prisoverslag"}
              </p>
              <div className="mt-0.5 flex items-baseline gap-1">
                <p className="text-lg font-bold leading-none text-foreground sm:text-xl">{roundPrice(total)}</p>
                <span className="text-[11px] text-muted-foreground">kr</span>
                <span className="ml-1 truncate text-[10px] text-muted-foreground">
                  · {selectedInterval && selectedInterval !== "engangskøb"
                    ? INTERVAL_LABELS[selectedInterval] || selectedInterval
                    : "engangskøb"}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={justAdded}
            className={`h-10 w-full gap-1.5 rounded-lg text-xs font-semibold transition-all sm:h-11 sm:text-sm ${
              justAdded
                ? "bg-emerald-600 text-white"
                : "bg-[hsl(var(--ind)_70%_38%)] text-white shadow-lg shadow-[hsl(var(--ind)_70%_38%_/_0.28)] hover:bg-[hsl(var(--ind)_70%_32%)] active:scale-[0.98]"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Tilføjet!
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                Tilføj til bestilling · {roundPrice(total)} kr
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
