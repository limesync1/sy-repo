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
  stepDetails?: { label: string; value: number; unit: string; subtotal: number }[];
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
  ugentlig: "Ugentlig",
  hver_14_dag: "Hver 14. dag",
  månedlig: "Månedlig",
  kvartalsvis: "Kvartalsvis",
};
