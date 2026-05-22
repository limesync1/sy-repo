// lock-business-plans — daglig cron der "fryser" abonnementsændringer 3 dage
// før næste fakturering. Når en plan er låst bruger Stripe (via webhook-data
// og create-checkout-session ved fornyelse) `locked_extra_employee_logins`
// og `locked_accounting_integration` i stedet for de aktuelle toggles.
// Det forhindrer at virksomheder skruer ned dagen før fakturering.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export const LOCK_WINDOW_DAYS = 3;

export interface LockCandidate {
  id: string;
  extra_employee_logins: number | null;
  accounting_integration_enabled: boolean | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  locked_at: string | null;
}

export interface LockDecision {
  shouldLock: boolean;
  reason: "no_period_end" | "period_passed" | "outside_window" | "already_locked_this_cycle" | "lock";
  patch?: {
    locked_extra_employee_logins: number;
    locked_accounting_integration: boolean;
    locked_at: string;
  };
}

/**
 * Ren funktion der afgør om en plan skal låses nu. Adskilt fra DB-koden
 * så vi kan unit-teste at:
 *  1) Vi låser indenfor de 3 dage før period_end
 *  2) Vi IKKE låser når period_end er passeret
 *  3) Vi IKKE låser hvis allerede låst i samme cyklus (locked_at indenfor
 *     30 dage før period_end)
 *  4) Vi IKKE låser når period_end ligger udenfor vinduet
 */
export function decideLock(plan: LockCandidate, now: Date): LockDecision {
  const periodEnd = plan.current_period_end || plan.trial_ends_at;
  if (!periodEnd) return { shouldLock: false, reason: "no_period_end" };
  const periodEndMs = new Date(periodEnd).getTime();
  const nowMs = now.getTime();
  if (periodEndMs < nowMs) return { shouldLock: false, reason: "period_passed" };
  const lockThresholdMs = nowMs + LOCK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (periodEndMs > lockThresholdMs) return { shouldLock: false, reason: "outside_window" };
  if (plan.locked_at) {
    const lockedMs = new Date(plan.locked_at).getTime();
    if (lockedMs > periodEndMs - 30 * 24 * 60 * 60 * 1000) {
      return { shouldLock: false, reason: "already_locked_this_cycle" };
    }
  }
  return {
    shouldLock: true,
    reason: "lock",
    patch: {
      locked_extra_employee_logins: plan.extra_employee_logins ?? 0,
      locked_accounting_integration: !!plan.accounting_integration_enabled,
      locked_at: now.toISOString(),
    },
  };
}

Deno.serve(async (req) => {
  try {
    const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";
    const ok = CRON_SECRET && (authHeader === `Bearer ${CRON_SECRET}` || authHeader === `Bearer ${SERVICE_KEY}`);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }
    const now = Date.now();
    const lockThreshold = new Date(now + LOCK_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Find planer hvor næste fakturering (trial_ends_at eller current_period_end)
    // ligger inden for låsevinduet OG som endnu ikke er låst i denne periode.
    const { data: plans, error } = await supabase
      .from("business_plans")
      .select("id, business_id, extra_employee_logins, accounting_integration_enabled, trial_ends_at, current_period_end, locked_at")
      .or(`trial_ends_at.lte.${lockThreshold},current_period_end.lte.${lockThreshold}`)
      .limit(500);
    if (error) throw error;

    let locked = 0;
    const nowDate = new Date(now);
    for (const p of (plans || []) as any[]) {
      const decision = decideLock(p as LockCandidate, nowDate);
      if (!decision.shouldLock || !decision.patch) continue;
      const { error: upErr } = await supabase
        .from("business_plans")
        .update(decision.patch)
        .eq("id", p.id);
      if (!upErr) locked++;
    }

    return new Response(JSON.stringify({ ok: true, locked, scanned: plans?.length || 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lock-business-plans error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});