import type { CalculatorStep, Service } from "@/hooks/useDatabase";

export interface PricingSnapshotStep {
  id: string;
  label: string;
  unit: string;
  price_per_unit: number;
  min_value: number;
  max_value: number;
  default_value: number;
  sort_order: number;
}

export interface PricingSnapshot {
  pricing_type: Service["pricing_type"];
  base_price: number;
  unit?: string | null;
  interval_options: string[];
  calculator_steps: PricingSnapshotStep[];
}

export interface ServiceStepDetail {
  id?: string;
  label: string;
  value: number;
  unit: string;
  price_per_unit?: number;
  subtotal: number;
  min_value?: number;
  max_value?: number;
  default_value?: number;
  sort_order?: number;
}

export const roundPrice = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export const getSmartStep = (unit: string, min: number, max: number): number => {
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

export const buildPricingSnapshot = (
  service: Service & { calculator_steps?: CalculatorStep[] },
): PricingSnapshot => ({
  pricing_type: service.pricing_type,
  base_price: Number(service.base_price || 0),
  unit: service.unit,
  interval_options:
    service.interval_options && service.interval_options.length > 0
      ? service.interval_options
      : ["engangskøb"],
  calculator_steps: [...(service.calculator_steps || [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((step) => ({
      id: step.id,
      label: step.label,
      unit: step.unit || service.unit || "stk",
      price_per_unit: Number(step.price_per_unit || 0),
      min_value: Number(step.min_value ?? 0),
      max_value: Number(step.max_value ?? 100),
      default_value: Number(step.default_value ?? step.min_value ?? 0),
      sort_order: Number(step.sort_order ?? 0),
    })),
});