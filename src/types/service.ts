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

export const INTERVAL_LABELS: Record<string, string> = {
  engangskøb: "Engangskøb",
  "10_min": "Hvert 10. minut",
  daglig: "Daglig",
  ugentlig: "Ugentlig",
  hver_14_dag: "Hver 14. dag",
  hver_4_uge: "Hver 4. uge",
  hver_8_uge: "Hver 8. uge",
  månedlig: "Månedlig",
  kvartalsvis: "Kvartalsvis",
  halvårlig: "Halvårlig",
  årlig: "Årlig",
};
