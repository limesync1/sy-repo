import { useState } from "react";
import { Service, CalculatorStep } from "@/types/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/price-format";

const FixedPriceService = ({ service }: { service: Service }) => {
  const { addItem } = useCart();
  return (
    <div className="flex items-center justify-between border-t border-border pt-4">
      <span className="text-2xl font-bold text-foreground">{formatPrice(service.fixedPrice)}</span>
      <Button
        onClick={() => {
          addItem({ serviceId: service.id, serviceName: service.name, total: service.fixedPrice!, details: "Specifik pris", quantity: 1 });
          toast.success(`${service.name} tilføjet til kurv`);
        }}
        className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
      >
        <ShoppingCart className="h-4 w-4" /> Læg i kurv
      </Button>
    </div>
  );
};

const HourlyService = ({ service }: { service: Service }) => {
  const [hours, setHours] = useState(service.minHours || 1);
  const { addItem } = useCart();
  const total = hours * (service.hourlyRate || 0);

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{formatPrice(service.hourlyRate)}/time</span>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setHours(Math.max(service.minHours || 1, hours - 1))}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center font-semibold">{hours} t</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setHours(Math.min(service.maxHours || 99, hours + 1))}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-foreground">{formatPrice(total)}</span>
        <Button
          onClick={() => {
            addItem({ serviceId: service.id, serviceName: service.name, total, details: `${hours} timer á ${service.hourlyRate} kr`, quantity: 1 });
            toast.success(`${service.name} tilføjet til kurv`);
          }}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <ShoppingCart className="h-4 w-4" /> Læg i kurv
        </Button>
      </div>
    </div>
  );
};

const CalculatorService = ({ service }: { service: Service }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const { addItem } = useCart();
  const steps = service.calculatorSteps || [];

  const calculateTotal = () => {
    let total = service.basePrice || 0;
    steps.forEach((step) => {
      const answer = answers[step.id];
      if (!answer) return;
      if (step.type === "choice" && step.options) {
        const opt = step.options.find((o) => o.id === answer);
        if (opt) total += opt.priceAdjustment;
      }
      if (step.type === "multi-choice" && step.options && Array.isArray(answer)) {
        answer.forEach((optId: string) => {
          const opt = step.options!.find((o) => o.id === optId);
          if (opt) total += opt.priceAdjustment;
        });
      }
      if (step.type === "number" && step.pricePerUnit) {
        total += (answer as number) * step.pricePerUnit;
      }
      if (step.type === "yes-no" && answer === true && step.yesPrice) {
        total += step.yesPrice;
      }
    });
    return total;
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const total = calculateTotal();

  const renderStep = (step: CalculatorStep) => {
    const answer = answers[step.id];

    if (step.type === "choice" && step.options) {
      return (
        <div className="grid gap-2">
          {step.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setAnswers({ ...answers, [step.id]: opt.id })}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${answer === opt.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"}`}
            >
              <span className="font-medium text-foreground">{opt.label}</span>
              <div className="flex items-center gap-2">
                {opt.priceAdjustment > 0 && <span className="text-sm text-muted-foreground">+{formatPrice(opt.priceAdjustment)}</span>}
                {answer === opt.id && <Check className="h-5 w-5 text-accent" />}
              </div>
            </button>
          ))}
        </div>
      );
    }

    if (step.type === "multi-choice" && step.options) {
      const selected: string[] = answer || [];
      return (
        <div className="grid gap-2">
          {step.options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => {
                  const next = isSelected ? selected.filter((id) => id !== opt.id) : [...selected, opt.id];
                  setAnswers({ ...answers, [step.id]: next });
                }}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${isSelected ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"}`}
              >
                <span className="font-medium text-foreground">{opt.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">+{formatPrice(opt.priceAdjustment)}</span>
                  {isSelected && <Check className="h-5 w-5 text-accent" />}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (step.type === "number") {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={step.min}
              max={step.max}
              value={answer || step.min || 0}
              onChange={(e) => setAnswers({ ...answers, [step.id]: Number(e.target.value) })}
              className="h-12 text-center text-lg font-semibold"
            />
            <span className="text-sm font-medium text-muted-foreground">{step.unit}</span>
          </div>
          {step.pricePerUnit && (
            <p className="text-sm text-muted-foreground">{step.pricePerUnit} kr/{step.unit}</p>
          )}
        </div>
      );
    }

    if (step.type === "yes-no") {
      return (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAnswers({ ...answers, [step.id]: true })}
            className={`rounded-xl border p-4 font-medium transition-all ${answer === true ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"}`}
          >
            Ja {step.yesPrice && <span className="text-sm text-muted-foreground">(+{formatPrice(step.yesPrice)})</span>}
          </button>
          <button
            onClick={() => setAnswers({ ...answers, [step.id]: false })}
            className={`rounded-xl border p-4 font-medium transition-all ${answer === false ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"}`}
          >
            Nej
          </button>
        </div>
      );
    }

    return null;
  };

  const buildDetails = () => {
    return steps.map((s) => {
      const a = answers[s.id];
      if (!a) return null;
      if (s.type === "choice" && s.options) return `${s.label}: ${s.options.find((o) => o.id === a)?.label}`;
      if (s.type === "multi-choice" && s.options && Array.isArray(a)) return `${s.label}: ${a.map((id: string) => s.options!.find((o) => o.id === id)?.label).join(", ")}`;
      if (s.type === "number") return `${s.label}: ${a} ${s.unit}`;
      if (s.type === "yes-no") return `${s.label}: ${a ? "Ja" : "Nej"}`;
      return null;
    }).filter(Boolean).join(" • ");
  };

  return (
    <div className="space-y-4 border-t border-border pt-4">
      {/* Progress */}
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentStep ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>

      {/* Step label */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Trin {currentStep + 1} af {steps.length}</p>
        <p className="text-lg font-bold text-foreground">{formatPrice(total)}</p>
      </div>

      <h4 className="text-lg font-semibold text-foreground">{step.label}</h4>

      {renderStep(step)}

      <div className="flex gap-3 pt-2">
        {currentStep > 0 && (
          <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>Tilbage</Button>
        )}
        {!isLast ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!answers[step.id] && answers[step.id] !== false}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Næste
          </Button>
        ) : (
          <Button
            onClick={() => {
              addItem({ serviceId: service.id, serviceName: service.name, total, details: buildDetails(), quantity: 1 });
              toast.success(`${service.name} tilføjet til kurv`);
              setCurrentStep(0);
              setAnswers({});
            }}
            disabled={!answers[step.id] && answers[step.id] !== false}
            className="flex-1 gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <ShoppingCart className="h-4 w-4" /> Læg i kurv – {formatPrice(total)}
          </Button>
        )}
      </div>
    </div>
  );
};

const ServiceCard = ({ service }: { service: Service }) => {
  const priceLabel = service.priceType === "fixed"
    ? formatPrice(service.fixedPrice)
    : service.priceType === "hourly"
    ? `Fra ${formatPrice((service.hourlyRate || 0) * (service.minHours || 1))}`
    : "Beregn pris";

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm transition-all">
      {/* Color bar */}
      <div className="h-2 bg-gradient-to-r from-accent to-accent/60" />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{service.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
            {priceLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {service.priceType === "fixed" && <FixedPriceService service={service} />}
        {service.priceType === "hourly" && <HourlyService service={service} />}
        {service.priceType === "calculator" && <CalculatorService service={service} />}
      </CardContent>
    </Card>
  );
};

export default ServiceCard;
