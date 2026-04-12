import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { ImageIcon, ShoppingCart, Minus, Plus } from "lucide-react";
import type { Service, CalculatorStep } from "@/hooks/useDatabase";

interface Props {
  service: Service & { calculator_steps?: CalculatorStep[] };
}

/* ── Stepper: +/- with number display ── */
const StepperInput = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
}) => {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));

  return (
    <div className="flex items-center gap-0">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div className="flex h-9 min-w-[4.5rem] items-center justify-center border-y border-border bg-card px-2 text-sm font-semibold text-foreground">
        {value} {unit}
      </div>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const DynamicServiceCard = ({ service }: Props) => {
  const { addItem } = useCart();
  const [hours, setHours] = useState(1);
  const [stepValues, setStepValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    service.calculator_steps?.forEach((s) => {
      initial[s.id] = s.default_value || 1;
    });
    return initial;
  });

  const pricingLabels: Record<string, string> = {
    fast_pris: "Fast pris",
    timepris: "Timepris",
    prisberegner: "Prisberegner",
  };

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
    const total = calculateTotal();
    let details = "";
    if (service.pricing_type === "fast_pris") details = "Fast pris";
    else if (service.pricing_type === "timepris") details = `${hours} timer`;
    else {
      details = (service.calculator_steps || [])
        .map((s) => `${s.label}: ${stepValues[s.id]} ${s.unit}`)
        .join(", ");
    }
    addItem({ serviceId: service.id, serviceName: service.name, total, details, quantity: 1 });
    toast.success(`${service.name} tilføjet til kurv`);
  };

  const sortedSteps = [...(service.calculator_steps || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const total = calculateTotal();

  return (
    <Card className="overflow-hidden border-border transition-all hover:shadow-md">
      {/* Image */}
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
        {/* Header */}
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
              <StepperInput
                value={hours}
                onChange={setHours}
                min={0.5}
                max={24}
                step={0.5}
                unit="t"
              />
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
                <div
                  key={step.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    idx !== sortedSteps.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{step.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {step.price_per_unit} kr / {step.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StepperInput
                      value={stepValues[step.id] || 1}
                      onChange={(v) => setStepValues((prev) => ({ ...prev, [step.id]: v }))}
                      min={step.min_value || 1}
                      max={step.max_value || 100}
                      unit={step.unit}
                    />
                    <span className="w-16 text-right text-sm font-semibold text-foreground">
                      {stepTotal} kr
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Total row */}
            <div className="flex items-center justify-between bg-secondary/40 px-4 py-3">
              <span className="text-sm font-semibold text-foreground">I alt</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">{total}</span>
                <span className="text-sm text-muted-foreground">kr</span>
              </div>
            </div>
          </div>
        )}

        <Button onClick={handleAdd} className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90">
          <ShoppingCart className="h-4 w-4" />
          Tilføj til kurv – {total} kr
        </Button>
      </CardContent>
    </Card>
  );
};

export default DynamicServiceCard;
