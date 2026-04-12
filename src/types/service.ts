// Types for the service/calculator system
export interface CalculatorOption {
  id: string;
  label: string;
  priceAdjustment: number; // added to total
}

export interface CalculatorStep {
  id: string;
  label: string;
  type: "choice" | "multi-choice" | "number" | "yes-no";
  // For choice/multi-choice
  options?: CalculatorOption[];
  // For number
  unit?: string;
  pricePerUnit?: number;
  min?: number;
  max?: number;
  // For yes-no
  yesPrice?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  image: string;
  priceType: "fixed" | "hourly" | "calculator";
  // Fixed
  fixedPrice?: number;
  // Hourly
  hourlyRate?: number;
  minHours?: number;
  maxHours?: number;
  // Calculator
  calculatorSteps?: CalculatorStep[];
  basePrice?: number;
}

export interface CartItem {
  serviceId: string;
  serviceName: string;
  total: number;
  details: string;
  quantity: number;
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
