// Klient-side Stripe.js utility — bruges af StripeCheckoutDialog.
import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const environment: StripeEnv = clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN er ikke konfigureret");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return environment;
}

/** Mapper en (interval, addon) til de korrekte Stripe price-IDs vi har oprettet. */
export const STRIPE_PRICE_IDS = {
  base: { monthly: "base_monthly", quarterly: "base_quarterly", yearly: "base_yearly" },
  route: { monthly: "route_monthly", quarterly: "route_quarterly", yearly: "route_yearly" },
  accounting: { monthly: "accounting_monthly", quarterly: "accounting_quarterly", yearly: "accounting_yearly" },
  employee: { monthly: "employee_monthly", quarterly: "employee_quarterly", yearly: "employee_yearly" },
} as const;

export type BillingPeriod = "monthly" | "quarterly" | "yearly";

export function buildPriceSelection(opts: {
  billingPeriod: BillingPeriod;
  routePlanning: boolean;
  accounting: boolean;
  extraEmployeeLogins: number;
}) {
  const period = opts.billingPeriod;
  return {
    basePriceId: STRIPE_PRICE_IDS.base[period],
    addonPriceIds: [
      ...(opts.routePlanning ? [STRIPE_PRICE_IDS.route[period]] : []),
      ...(opts.accounting ? [STRIPE_PRICE_IDS.accounting[period]] : []),
    ],
    extraEmployeePriceId: STRIPE_PRICE_IDS.employee[period],
    extraEmployeeLogins: opts.extraEmployeeLogins,
  };
}