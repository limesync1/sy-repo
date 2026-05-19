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

const LOCK_WINDOW_DAYS = 3;

Deno.serve(async (req) => {
  try {
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
    for (const p of (plans || []) as any[]) {
      const periodEnd = p.current_period_end || p.trial_ends_at;
      if (!periodEnd) continue;
      const periodEndMs = new Date(periodEnd).getTime();
      if (periodEndMs < now) continue; // allerede passeret

      // Spring over hvis allerede låst for denne periode (locked_at efter
      // forrige period_start, dvs. inden for samme cyklus). Simpel heuristik:
      // hvis locked_at er nyere end (periodEnd - 30 dage), antag samme periode.
      if (p.locked_at) {
        const lockedMs = new Date(p.locked_at).getTime();
        if (lockedMs > periodEndMs - 30 * 24 * 60 * 60 * 1000) continue;
      }

      const { error: upErr } = await supabase
        .from("business_plans")
        .update({
          locked_extra_employee_logins: p.extra_employee_logins ?? 0,
          locked_accounting_integration: !!p.accounting_integration_enabled,
          locked_at: new Date().toISOString(),
        })
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