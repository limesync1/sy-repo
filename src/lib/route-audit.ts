import { supabase } from "@/integrations/supabase/client";

/**
 * Logger en rute- eller serie-mutation til `route_audit_log` via RPC'en
 * `log_route_audit`, der selv registrerer IP og enhed ud fra request-headere.
 * Aldrig throwing — audit må ikke kunne blokere en lovlig handling.
 * Brug `scope` til at angive om ændringen ramte én forekomst, fremtidige
 * eller hele serien, så historikken kan rekonstrueres senere.
 */
export type RouteAuditScope = "single" | "future" | "all" | null;

export type RouteAuditInput = {
  /** Hvis ikke angivet, slås den op via `route_id`. */
  business_id?: string | null;
  action: string;
  route_id?: string | null;
  agreement_id?: string | null;
  scope?: RouteAuditScope;
  affected_count?: number;
  /** Kort dansk sætning om hvad der konkret skete — vises i historikken. */
  summary?: string | null;
  before?: unknown;
  after?: unknown;
};

export async function logRouteAudit(input: RouteAuditInput): Promise<void> {
  try {
    let businessId = input.business_id ?? null;
    if (!businessId && input.route_id) {
      const { data } = await supabase
        .from("routes")
        .select("business_id")
        .eq("id", input.route_id)
        .maybeSingle();
      businessId = (data as any)?.business_id ?? null;
    }
    if (!businessId) {
      // Uden business_id kan RLS ikke acceptere insert — log lokalt og opgiv.
      // eslint-disable-next-line no-console
      console.warn("[route-audit] skipping insert — no business_id resolvable", input.action);
      return;
    }
    await supabase.rpc("log_route_audit", {
      p_business_id: businessId,
      p_action: input.action,
      p_route_id: input.route_id ?? null,
      p_agreement_id: input.agreement_id ?? null,
      p_scope: input.scope ?? null,
      p_affected_count: input.affected_count ?? 0,
      p_summary: input.summary ?? null,
      p_before: (input.before ?? null) as any,
      p_after: (input.after ?? null) as any,
    });
  } catch (err) {
    // Audit-fejl må aldrig blokere brugerhandlinger — log lokalt og fortsæt.
    // eslint-disable-next-line no-console
    console.warn("[route-audit] insert failed", err);
  }
}
