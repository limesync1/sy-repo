import { supabase } from "@/integrations/supabase/client";

/**
 * Logger en rute- eller serie-mutation til `route_audit_log`.
 * Aldrig throwing — audit må ikke kunne blokere en lovlig handling.
 * Brug `scope` til at angive om ændringen ramte én forekomst, fremtidige
 * eller hele serien, så historikken kan rekonstrueres senere.
 */
export type RouteAuditScope = "single" | "future" | "all" | null;

export type RouteAuditInput = {
  business_id: string;
  action: string;
  route_id?: string | null;
  agreement_id?: string | null;
  scope?: RouteAuditScope;
  affected_count?: number;
  before?: unknown;
  after?: unknown;
};

export async function logRouteAudit(input: RouteAuditInput): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    await supabase.from("route_audit_log").insert({
      business_id: input.business_id,
      actor_id: userRes.user?.id ?? null,
      route_id: input.route_id ?? null,
      agreement_id: input.agreement_id ?? null,
      action: input.action,
      scope: input.scope ?? null,
      affected_count: input.affected_count ?? 0,
      before_data: (input.before ?? null) as any,
      after_data: (input.after ?? null) as any,
    });
  } catch (err) {
    // Audit-fejl må aldrig blokere brugerhandlinger — log lokalt og fortsæt.
    // eslint-disable-next-line no-console
    console.warn("[route-audit] insert failed", err);
  }
}