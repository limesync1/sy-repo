// Types for the service/calculator system
export interface CalculatorOption {
  id: string;
  label: string;
  priceAdjustment: number;
}

export interface CalculatorStep {
  id: string;
  label: string;
  type: "choice" | "multi-choice" | "number" | "yes-no";
  options?: CalculatorOption[];
  unit?: string;
  pricePerUnit?: number;
  min?: number;
  max?: number;
  yesPrice?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  image: string;
  priceType: "fixed" | "hourly" | "calculator";
  fixedPrice?: number;
  hourlyRate?: number;
  minHours?: number;
  maxHours?: number;
  calculatorSteps?: CalculatorStep[];
  basePrice?: number;
}

export interface CartItem {
  serviceId: string;
  serviceName: string;
  total: number;
  details: string;
  quantity: number;
  interval?: string;
  businessId?: string;
  businessName?: string;
  businessLogoUrl?: string;
  stepDetails?: {
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
  }[];
  pricingSnapshot?: {
    pricing_type?: string;
    base_price?: number;
    unit?: string | null;
    interval_options?: string[] | null;
    calculator_steps?: {
      id: string;
      label: string;
      unit: string;
      price_per_unit: number;
      min_value?: number;
      max_value?: number;
      default_value?: number;
      sort_order?: number;
    }[];
  };
}

export interface BusinessInfo {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  heroImage: string;
  logo: string;
  openingHours: { day: string; open: string; close: string }[];
  faq: { question: string; answer: string }[];
  contact: { email: string; phone: string; address: string };
}

// Tilbagekompatibel "label-map": alle opslag (også ukendte nøgler i nyt
// `every_<N>_<unit>`-format) går igennem den centrale formatInterval-funktion,
// så eksisterende `INTERVAL_LABELS[x] || x`-mønstre rundt om i kodebasen
// automatisk får grammatisk korrekte danske labels.
import { formatInterval } from "@/lib/interval";

const LEGACY_INTERVAL_LABELS: Record<string, string> = {
  engangskøb: formatInterval("engangskøb"),
  daglig: formatInterval("daglig"),
  hver_2_dag: formatInterval("hver_2_dag"),
  ugentlig: formatInterval("ugentlig"),
  hver_14_dag: formatInterval("hver_14_dag"),
  hver_3_uge: formatInterval("hver_3_uge"),
  hver_4_uge: formatInterval("hver_4_uge"),
  hver_8_uge: formatInterval("hver_8_uge"),
  månedlig: formatInterval("månedlig"),
  kvartalsvis: formatInterval("kvartalsvis"),
  halvårlig: formatInterval("halvårlig"),
  årlig: formatInterval("årlig"),
};

export const INTERVAL_LABELS = new Proxy(LEGACY_INTERVAL_LABELS, {
  get: (_t, key) => formatInterval(String(key)),
  has: () => true,
});
