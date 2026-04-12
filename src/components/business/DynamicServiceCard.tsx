import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { ImageIcon, ShoppingCart } from "lucide-react";
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
    addItem({ serviceId: service.id, serviceName: service.name, total, details, quantity: 1 });
    toast.success(`${service.name} tilføjet til kurv`);
  };

  return (
    <Card className="overflow-hidden border-border transition-all hover:shadow-md">
      {/* Image on top for all screen sizes */}
      {service.image_url && (
        <div className="relative h-44 w-full overflow-hidden bg-secondary md:h-52">
          <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
          <Badge variant="outline" className="absolute right-3 top-3 border-background/50 bg-background/80 backdrop-blur-sm">
            {pricingLabels[service.pricing_type]}
          </Badge>
        </div>
      )}
      {!service.image_url && (
        <div className="relative flex h-32 w-full items-center justify-center bg-secondary/50">
          <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
          <Badge variant="outline" className="absolute right-3 top-3">
            {pricingLabels[service.pricing_type]}
          </Badge>
        </div>
      )}

      <CardContent className="p-5 md:p-6">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-foreground md:text-xl">{service.name}</h3>
          {(service as any).subcategory && (
            <span className="text-xs font-medium text-accent">{(service as any).subcategory}</span>
          )}
          {service.description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{service.description}</p>}
        </div>

        {service.pricing_type === "fast_pris" && (
          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{service.base_price}</span>
            <span className="text-sm text-muted-foreground">kr</span>
          </div>
        )}

        {service.pricing_type === "timepris" && (
          <div className="mb-4 space-y-3">
            <p className="text-sm text-muted-foreground">{service.base_price} kr / time</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Timer:</span>
              <Slider value={[hours]} onValueChange={([v]) => setHours(v)} min={1} max={10} step={0.5} className="flex-1" />
              <span className="w-12 text-right font-medium text-foreground">{hours}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{calculateTotal()}</span>
              <span className="text-sm text-muted-foreground">kr</span>
            </div>
          </div>
        )}

        {service.pricing_type === "prisberegner" && service.calculator_steps && (
          <div className="mb-4 space-y-4 rounded-lg bg-secondary/30 p-4">
            {service.calculator_steps.map((step) => (
              <div key={step.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{step.label} ({step.unit})</span>
                  <span className="font-medium text-foreground">{stepValues[step.id]} × {step.price_per_unit} kr</span>
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
            <div className="flex items-baseline gap-1 border-t border-border pt-3">
              <span className="text-2xl font-bold text-foreground">{calculateTotal()}</span>
              <span className="text-sm text-muted-foreground">kr i alt</span>
            </div>
          </div>
        )}

        <Button onClick={handleAdd} className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90">
          <ShoppingCart className="h-4 w-4" />
          Tilføj til kurv – {calculateTotal()} kr
        </Button>
      </CardContent>
    </Card>
  );
};

export default DynamicServiceCard;
