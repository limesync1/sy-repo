import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import type { Service, CalculatorStep } from "@/hooks/useDatabase";

interface Props {
  service: Service & { calculator_steps?: CalculatorStep[] };
}

const DynamicServiceCard = ({ service }: Props) => {
  const { addItem } = useCart();
  const [hours, setHours] = useState(1);
  const [stepValues, setStepValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    service.calculator_steps?.forEach((s) => { initial[s.id] = s.default_value || 1; });
    return initial;
  });

  const pricingLabels: Record<string, string> = { fast_pris: "Fast pris", timepris: "Timepris", prisberegner: "Prisberegner" };

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

    addItem({
      serviceId: service.id,
      serviceName: service.name,
      total,
      details,
      quantity: 1,
    });
    toast.success(`${service.name} tilføjet til kurv`);
  };

  return (
    <Card className="overflow-hidden border-border/60 transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground">{service.name}</h3>
            {service.description && <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>}
          </div>
          <Badge variant="secondary">{pricingLabels[service.pricing_type]}</Badge>
        </div>

        {service.pricing_type === "fast_pris" && (
          <p className="mb-4 text-2xl font-bold text-accent">{service.base_price} kr</p>
        )}

        {service.pricing_type === "timepris" && (
          <div className="mb-4 space-y-3">
            <p className="text-sm text-muted-foreground">{service.base_price} kr / time</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Timer:</span>
              <Slider value={[hours]} onValueChange={([v]) => setHours(v)} min={1} max={10} step={0.5} className="flex-1" />
              <span className="w-12 text-right font-medium text-foreground">{hours}</span>
            </div>
            <p className="text-2xl font-bold text-accent">{calculateTotal()} kr</p>
          </div>
        )}

        {service.pricing_type === "prisberegner" && service.calculator_steps && (
          <div className="mb-4 space-y-4">
            {service.calculator_steps.map((step) => (
              <div key={step.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{step.label} ({step.unit})</span>
                  <span className="font-medium text-foreground">{stepValues[step.id]} {step.unit} × {step.price_per_unit} kr</span>
                </div>
                <Slider
                  value={[stepValues[step.id]]}
                  onValueChange={([v]) => setStepValues((prev) => ({ ...prev, [step.id]: v }))}
                  min={step.min_value || 1}
                  max={step.max_value || 100}
                  step={1}
                />
              </div>
            ))}
            <p className="text-2xl font-bold text-accent">{calculateTotal()} kr</p>
          </div>
        )}

        <Button onClick={handleAdd} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          Tilføj til kurv – {calculateTotal()} kr
        </Button>
      </CardContent>
    </Card>
  );
};

export default DynamicServiceCard;
