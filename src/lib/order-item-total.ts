// Overslag for én service i «Opret bestilling». Spejler serverens prislogik:
// fast pris = pris × antal, timepris = timepris × timer,
// prisberegner = sum af felter (klampet til min/max) — grundprisen indgår ikke.
export type ItemStep = { id: string; price_per_unit: number; min_value?: number | null; max_value?: number | null };
export type ItemService = { pricing_type: "fast_pris" | "timepris" | "prisberegner"; base_price: number | null; calculator_steps?: ItemStep[] };
export type ItemInput = { service: ItemService; quantity?: number; hours: number; stepValues: Record<string, number> };

export const clampStep = (st: ItemStep, v: number) =>
  Math.min(Math.max(Number(v) || 0, Number(st.min_value ?? 0)), Number(st.max_value ?? 100000));

export function calcItemTotal(it: ItemInput): number {
  const s = it.service;
  const base = Number(s.base_price || 0);
  if (s.pricing_type === "fast_pris") return base * Math.max(1, Number(it.quantity) || 1);
  if (s.pricing_type === "timepris") return base * it.hours;
  return (s.calculator_steps || []).reduce((t, st) => t + clampStep(st, it.stepValues[st.id] ?? 0) * Number(st.price_per_unit || 0), 0);
}
