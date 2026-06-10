/**
 * Resolver for "tidlig udførelse" — om en medarbejder må starte/udføre
 * en rute FØR rutens dato er aktuel (eller efter den er passeret).
 *
 * Tre lag — mest specifikke vinder, derefter medarbejder, derefter virksomhed:
 *
 *   route.allow_early_completion === true           → tillad
 *   employee.early_completion_mode === 'always'     → tillad
 *   employee.early_completion_mode === 'never'      → afvis
 *   business.allow_early_completion_default === true → tillad (fallback)
 *   ellers                                          → afvis
 */
export type EarlyCompletionMode = "inherit" | "always" | "never";

export type EarlyCompletionInput = {
  routeAllow?: boolean | null;
  employeeMode?: EarlyCompletionMode | string | null;
  businessDefault?: boolean | null;
};

export function canCompleteEarly(input: EarlyCompletionInput): boolean {
  if (input.routeAllow === true) return true;
  const mode = (input.employeeMode || "inherit") as EarlyCompletionMode;
  if (mode === "always") return true;
  if (mode === "never") return false;
  return input.businessDefault === true;
}

/** Forklar i klar dansk hvorfor en rute er låst/oplåst — bruges i tooltips. */
export function earlyCompletionReason(input: EarlyCompletionInput): string {
  if (input.routeAllow === true) return "Denne rute er specifikt låst op af virksomheden.";
  const mode = (input.employeeMode || "inherit") as EarlyCompletionMode;
  if (mode === "always") return "Din profil er låst op til at udføre ruter når som helst.";
  if (mode === "never") return "Din profil tillader ikke tidlig udførelse — kontakt din leder.";
  if (input.businessDefault === true) return "Virksomheden tillader tidlig udførelse som standard.";
  return "Ruten kan først udføres når dagen er aktuel.";
}