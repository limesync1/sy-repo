// Manuelle handlinger på fakturaer fra Serviceydere UI:
//   - send_reminder      (rykker 1/2/3 / collection / auto)
//   - credit_invoice     (krediter en bogført faktura)
//   - void_draft         (annullér en kladde-faktura/ordre)
//   - mark_paid          (bogfør manuel betaling)
// Efter handlingen pull'er vi straks invoice-state ind i orders så UI'et
// reflekterer ændringen uden at vente på næste cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeAdapter } from "../_shared/accounting/index.ts";
import { requireAuthenticatedUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAuthenticatedUser(req, SUPABASE_URL, ANON_KEY);
    if ("error" in auth) return json({ error: auth.error }, auth.status);
    const userClient = auth.userClient;

    const { order_id, action, params } = await req.json();
    if (!order_id || !action) return json({ error: "Missing order_id/action" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order } = await admin.from("orders")
      .select("id, business_id, invoice_external_id, total_amount, customer_email")
      .eq("id", order_id).maybeSingle();
    if (!order) return json({ error: "Order not found" }, 404);

    // Owner check
    const { data: biz } = await userClient.from("businesses")
      .select("id, owner_id").eq("id", order.business_id).maybeSingle();
    if (!biz || biz.owner_id !== auth.userId) return json({ error: "Forbidden" }, 403);

    const { data: integ } = await admin.from("accounting_integrations")
      .select("*").eq("business_id", order.business_id).eq("is_active", true).maybeSingle();

    const { data: link } = integ
      ? await admin.from("accounting_order_links")
        .select("external_id, external_type").eq("business_id", order.business_id)
        .eq("provider", integ.provider).eq("order_id", order_id).maybeSingle()
      : { data: null } as any;

    const bookedInvoiceId = order.invoice_external_id ?? (link?.external_type === "invoice_booked" ? link.external_id : null);

    // Capability probe — kaldes af UI for at afgøre om knapper kan vises.
    // Vi prøver at slå fakturaen op hos udbyderen; hvis den ikke findes
    // (eller intet endnu er pushet) returnerer vi falske flag i stedet for
    // at bryde med en fejl, så UI'et bare skjuler knapperne.
    if (action === "check_capabilities") {
      const caps = {
        can_credit: false,
        can_void: false,
        can_mark_paid: false,
        is_booked: false,
        is_draft: false,
        exists_in_provider: false,
      };
      if (!integ) return json({ ok: true, caps });
      const adapter = makeAdapter(integ.provider, integ as any, integ.settings ?? {});
      try {
        if (bookedInvoiceId && typeof adapter.getInvoiceStates === "function") {
          const states = await adapter.getInvoiceStates([bookedInvoiceId]);
          const s = states?.[0];
          if (s) {
            caps.exists_in_provider = true;
            caps.is_booked = true;
            caps.can_credit = typeof adapter.creditInvoice === "function" && s.status !== "credited";
            caps.can_mark_paid = typeof adapter.markInvoicePaid === "function" && s.status !== "paid" && s.status !== "credited";
          }
        } else if (link?.external_id && typeof adapter.voidDraft === "function") {
          // Kladde — kan annulleres
          caps.exists_in_provider = true;
          caps.is_draft = true;
          caps.can_void = true;
        }
      } catch { /* ignorer — caps forbliver false så knapper skjules */ }
      return json({ ok: true, caps });
    }

    const markPaidLocally = async (amount: number, paidAt: string, note: string) => {
      await admin.from("orders").update({
        payment_status: "paid",
        paid_at: paidAt,
        paid_amount: amount,
        payment_status_synced_at: new Date().toISOString(),
      }).eq("id", order_id);
      return { ok: true, marked_paid: true, local_only: true, note };
    };

    if (!integ) {
      if (action === "mark_paid") {
        const amount = Number(params?.amount ?? order.total_amount ?? 0);
        if (!amount || amount <= 0) return json({ error: "Mangler beløb" }, 400);
        const paidAt = params?.paid_at ?? new Date().toISOString();
        const result = await markPaidLocally(amount, paidAt, "Betalingen er registreret i Serviceydere. Der er ingen aktiv regnskabsintegration at synkronisere til.");
        await admin.from("accounting_sync_log").insert({
          business_id: order.business_id, provider: "local",
          direction: "push", entity_type: "invoice", entity_id: order_id,
          external_id: null, status: "success", message: "Manuel handling: mark_paid",
        });
        return json(result);
      }
      return json({ error: "Ingen aktiv regnskabsintegration" }, 400);
    }

    const adapter = makeAdapter(integ.provider, integ as any, integ.settings ?? {});
    let result: any = { ok: true };

    try {
      if (action === "sync_now") {
        // No-op her — selve pull'en kører i fælles "fresh pull" blokken
        // nedenfor. Vi sætter blot et flag så vi ikke fejler.
        result = { ok: true, sync: true };
      } else if (action === "send_reminder") {
        return json({
          error: "Rykker-håndtering er flyttet til dit regnskabsprogram. Aktivér automatisk rykkerkørsel der.",
        }, 400);
      } else if (action === "credit_invoice") {
        if (typeof adapter.creditInvoice !== "function") {
          return json({ error: `${integ.provider} understøtter ikke kreditering via API` }, 400);
        }
        if (!bookedInvoiceId) return json({ error: "Faktura er ikke bogført endnu — kan ikke krediteres." }, 400);
        const res = await adapter.creditInvoice({
          invoice_external_id: bookedInvoiceId,
          reason: params?.reason ?? null,
        });
        await admin.from("orders").update({
          payment_status: "credited",
          credited_at: new Date().toISOString(),
          credit_note_external_id: res.credit_note_external_id,
          credit_note_external_number: res.credit_note_external_number,
        }).eq("id", order_id);
        result = { ok: true, credit_note: res };
      } else if (action === "void_draft") {
        if (typeof adapter.voidDraft !== "function") {
          return json({ error: `${integ.provider} understøtter ikke annullering via API` }, 400);
        }
        if (bookedInvoiceId || link?.external_type === "invoice_booked") {
          return json({ error: "Fakturaen er allerede bogført — brug kreditering i stedet for annullering." }, 400);
        }
        if (link?.external_id) {
          try {
            await adapter.voidDraft({
              external_id: link.external_id,
              external_type: (link.external_type as any) ?? "invoice_draft",
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            // Hvis kladden allerede er væk hos udbyderen, fortsæt med at annullere lokalt
            if (!/not\s*found|404|does not exist|ikke fundet/i.test(msg)) {
              throw e;
            }
          }
        }
        await admin.from("orders").update({
          voided_at: new Date().toISOString(),
          status: "cancelled",
        }).eq("id", order_id);
        await admin.from("accounting_order_links").delete()
          .eq("business_id", order.business_id).eq("provider", integ.provider).eq("order_id", order_id);
        result = {
          ok: true,
          voided: true,
          note: link?.external_id
            ? undefined
            : "Aftalen er annulleret lokalt. Der var ingen kladde i regnskabsprogrammet at annullere.",
        };
      } else if (action === "mark_paid") {
        const amount = Number(params?.amount ?? order.total_amount ?? 0);
        if (!amount || amount <= 0) return json({ error: "Mangler beløb" }, 400);
        const paidAt = params?.paid_at ?? new Date().toISOString();
        if (!bookedInvoiceId) {
          result = await markPaidLocally(amount, paidAt, "Betalingen er registreret i Serviceydere. Fakturaen er ikke bogført endnu, så der var intet at markere i regnskabsprogrammet.");
        } else {
          if (typeof adapter.markInvoicePaid !== "function") {
            return json({ error: `${integ.provider} understøtter ikke manuel betalingsmarkering via API` }, 400);
          }
          await adapter.markInvoicePaid({
            invoice_external_id: bookedInvoiceId,
            amount,
            paid_at: paidAt,
          });
          await admin.from("orders").update({
            payment_status: "paid",
            paid_at: paidAt,
            paid_amount: amount,
            payment_status_synced_at: new Date().toISOString(),
          }).eq("id", order_id);
          result = { ok: true, marked_paid: true };
        }
      } else {
        return json({ error: `Ukendt handling: ${action}` }, 400);
      }

      // Trigger en straks-pull af invoice state for at få fersk data
      if (typeof adapter.getInvoiceStates === "function" && bookedInvoiceId && action !== "mark_paid") {
        try {
          const states = await adapter.getInvoiceStates([bookedInvoiceId]);
          const s = states[0];
          if (s) {
            const freshUpdate: Record<string, unknown> = {
              payment_status: s.status,
              paid_at: s.paid_at,
              paid_amount: s.paid_amount ?? null,
              payment_status_synced_at: new Date().toISOString(),
              due_date: s.due_date ?? null,
            };
            if (Array.isArray(s.reminder_history) && s.reminder_history.length > 0) {
              freshUpdate.reminder_count = s.reminder_count ?? s.reminder_history.length;
              freshUpdate.last_reminder_at = s.last_reminder_at ?? undefined;
              freshUpdate.last_reminder_type = s.last_reminder_type ?? undefined;
              freshUpdate.reminder_history = s.reminder_history;
            }
            await admin.from("orders").update(freshUpdate).eq("id", order_id);
          }
        } catch { /* ignore — UI vil opdateres ved næste cron */ }
      }

      await admin.from("accounting_sync_log").insert({
        business_id: order.business_id, provider: integ.provider,
        direction: "push", entity_type: "invoice", entity_id: order_id,
        external_id: bookedInvoiceId ?? link?.external_id ?? null,
        status: "success", message: `Manuel handling: ${action}`,
      });

      return json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("accounting_sync_log").insert({
        business_id: order.business_id, provider: integ.provider,
        direction: "push", entity_type: "invoice", entity_id: order_id,
        status: "error", message: `${action}: ${msg}`,
      });
      return json({ error: msg }, 500);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});