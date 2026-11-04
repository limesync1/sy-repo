import type { AdminFeatureFlags } from "@/components/admin/shared/adminNav";

/**
 * Én sandhed for hvad en virksomhed kan i panelet. Plantypen gemmes i
 * business_plans.plan_kind og spejles af databasen ind i businesses.settings,
 * så panelet kan læse den uden ekstra forespørgsel. Serveren håndhæver det samme.
 */
export type PlanKind = "listing" | "full";

type BusinessLike = { settings?: unknown } | null | undefined;

export const planKindOf = (business: BusinessLike): PlanKind =>
  ((business?.settings as Record<string, unknown> | undefined)?.plan_kind === "listing" ? "listing" : "full");

export const isListingOnly = (business: BusinessLike) => planKindOf(business) === "listing";

export function adminFlagsFor(business: BusinessLike): AdminFeatureFlags {
  const s = (business?.settings ?? {}) as Record<string, unknown>;
  const operations = !isListingOnly(business);
  return {
    operations,
    routePlanning: operations && !!s.route_planning_enabled,
    leads: !!s.leads_enabled,
    livechat: !!s.livechat_enabled,
    accounting: operations && !!s.accounting_integration_enabled,
  };
}
