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
    if (!order) {
      // Capability-probes må ALDRIG bryde UI'et — hvis ordren ikke findes
      // (slettet, virtuel/projiceret række, stale cache) returnerer vi tomme
      // caps så knapperne bare skjules i stedet for at fejle med 404.
      if (action === "check_capabilities") {
        return json({ caps: {
          can_credit: false, can_void: false, can_mark_paid: false,
          can_download_pdf: false,
          is_booked: false, is_draft: false, exists_in_provider: false,
        } });
      }
      return json({ error: "Order not found" }, 404);
    }

    // Permission check.
    // - Owners (virksomhedspanelet) må alt.
    // - Medarbejdere (medarbejderpanelet) må KUN gensende faktura, ikke
    //   andre handlinger som kreditering/markér betalt mm.
    const { data: biz } = await userClient.from("businesses")
      .select("id, owner_id").eq("id", order.business_id).maybeSingle();
    const isOwner = !!biz && biz.owner_id === auth.userId;
    let isEmployee = false;
    if (!isOwner) {
      const { data: emp } = await admin.from("employees")
        .select("id, business_id, active")
        .eq("user_id", auth.userId)
        .eq("business_id", order.business_id)
        .maybeSingle();
      isEmployee = !!emp && emp.active !== false;
    }
    if (!isOwner && !isEmployee) return json({ error: "Forbidden" }, 403);
    if (!isOwner && action !== "resend_invoice" && action !== "check_capabilities") {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: integ } = await admin.from("accounting_integrations")
      .select("*").eq("business_id", order.business_id).eq("is_active", true).maybeSingle();

    const { data: link } = integ
      ? await admin.from("accounting_order_links")
        .select("external_id, external_type").eq("business_id", order.business_id)
        .eq("provider", integ.provider).eq("order_id", order_id).maybeSingle()
      : { data: null } as any;

    const bookedInvoiceId = order.invoice_external_id ?? (link?.external_type === "invoice_booked" ? link.external_id : null);
    const externalId = bookedInvoiceId ?? link?.external_id ?? null;

    // Capability probe — kaldes af UI for at afgøre om knapper kan vises.
    // Vi prøver at slå fakturaen op hos udbyderen; hvis den ikke findes
    // (eller intet endnu er pushet) returnerer vi falske flag i stedet for
    // at bryde med en fejl, så UI'et bare skjuler knapperne.
    if (action === "check_capabilities") {
      const caps = {
        can_credit: false,
        can_void: false,
        can_mark_paid: false,
        can_download_pdf: false,
        can_resend: false,
        is_booked: false,
        is_draft: false,
        exists_in_provider: false,
      };
      if (!integ) return json({ ok: true, caps });
      const adapter = makeAdapter(integ.provider, integ as any, integ.settings ?? {});
      // Hvis vi allerede har et faktura-ID gemt lokalt (enten på selve
      // ordren eller via accounting_order_links), så ved vi at fakturaen
      // findes hos udbyderen — selv hvis live-probe lige nu fejler pga.
      // udløbet demo, manglende token eller andre brugerfejl. Vi tillader
      // download/gensend baseret på det, og lader det egentlige kald give
      // en meningsfuld fejl hvis credentials stadig mangler.
      if (externalId) {
        caps.exists_in_provider = true;
        if (bookedInvoiceId || link?.external_type === "invoice_booked") {
          caps.is_booked = true;
          caps.can_resend = typeof adapter.resendInvoice === "function";
        } else {
          caps.is_draft = true;
        }
        caps.can_download_pdf = typeof adapter.getInvoicePdf === "function";
      }
      try {
        if (externalId && typeof adapter.getInvoiceStates === "function") {
          const states = await adapter.getInvoiceStates([externalId]);
          const s = states?.[0];
          if (s) {
            caps.exists_in_provider = true;
            // Skeln imellem bogført og kladde via raw payload (e-conomic falder
            // tilbage til /invoices/drafts hvis booked ikke findes). Vi vil
            // KUN tillade kreditering / markér betalt for reelt bogførte fakturaer.
            const raw = (s as any).raw ?? {};
            const isBooked = raw?.bookedInvoiceNumber != null;
            const isDraft = !isBooked && raw?.draftInvoiceNumber != null;
            caps.is_booked = isBooked;
            caps.is_draft = isDraft;
            const fullyPaid = s.status === "paid" || s.status === "credited";
            caps.can_credit = isBooked
              && typeof adapter.creditInvoice === "function"
              && s.status !== "credited";
            caps.can_mark_paid = isBooked
              && typeof adapter.markInvoicePaid === "function"
              && !fullyPaid;
            caps.can_void = isDraft && typeof adapter.voidDraft === "function";
            caps.can_download_pdf = typeof adapter.getInvoicePdf === "function";
            caps.can_resend = isBooked && typeof adapter.resendInvoice === "function";
          }
        } else if (link?.external_id && typeof adapter.voidDraft === "function") {
          // Kladde — kan annulleres
          caps.exists_in_provider = true;
          caps.is_draft = true;
          caps.can_void = true;
          caps.can_download_pdf = typeof adapter.getInvoicePdf === "function";
        }
      } catch { /* ignorer — vi har stadig fallback-caps fra externalId-blokken ovenfor */ }
      return json({ ok: true, caps });
    }

    // Gensend en bogført faktura til kunden via udbyderens egen e-mail-flow.
    // Bruges fra medarbejderpanelet når en aftale er markeret udført.
    if (action === "resend_invoice") {
      if (!integ) return json({ error: "Ingen aktiv regnskabsintegration" }, 400);
      const adapter = makeAdapter(integ.provider, integ as any, integ.settings ?? {});
      if (typeof adapter.resendInvoice !== "function") {
        return json({ error: `${integ.provider} understøtter ikke gensending af faktura` }, 400);
      }
      const sendId = bookedInvoiceId ?? link?.external_id ?? null;
      if (!sendId) return json({ error: "Fakturaen findes ikke i regnskabsprogrammet endnu." }, 404);
      const externalType: "invoice_booked" | "invoice_draft" =
        bookedInvoiceId ? "invoice_booked" : "invoice_draft";
      try {
        const res = await adapter.resendInvoice({
          invoice_external_id: sendId,
          external_type: externalType,
          customer_email: order.customer_email ?? null,
        });
        await admin.from("accounting_sync_log").insert({
          business_id: order.business_id, provider: integ.provider,
          direction: "push", entity_type: "invoice", entity_id: order_id,
          external_id: sendId, status: "success",
          message: `Faktura gensendt${res?.note ? `: ${res.note}` : ""}`,
        });
        return json({ ok: true, ...res });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await admin.from("accounting_sync_log").insert({
          business_id: order.business_id, provider: integ.provider,
          direction: "push", entity_type: "invoice", entity_id: order_id,
          status: "error", message: `resend_invoice: ${msg}`,
        });
        return json({ error: msg }, 500);
      }
    }

    // Download faktura-PDF fra regnskabsprogrammet. Returnerer base64 så
    // frontend kan trigge en download uden ekstra netværkskald.
    if (action === "download_invoice") {
      if (!integ) return json({ error: "Ingen aktiv regnskabsintegration" }, 400);
      const adapter = makeAdapter(integ.provider, integ as any, integ.settings ?? {});
      if (typeof adapter.getInvoicePdf !== "function") {
        return json({ error: `${integ.provider} understøtter ikke PDF-download` }, 400);
      }
      const pdfId = bookedInvoiceId ?? link?.external_id ?? null;
      if (!pdfId) return json({ error: "Fakturaen findes ikke i regnskabsprogrammet endnu." }, 404);
      const externalType: "invoice_booked" | "invoice_draft" =
        bookedInvoiceId ? "invoice_booked" : "invoice_draft";
      try {
        const pdf = await adapter.getInvoicePdf({
          invoice_external_id: pdfId,
          external_type: externalType,
        });
        return json({ ok: true, ...pdf });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return json({ error: msg }, 500);
      }
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
        if (!externalId) return json({ error: "Faktura er ikke bogført endnu — kan ikke krediteres." }, 400);
        const res = await adapter.creditInvoice({
          invoice_external_id: externalId,
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
      if (typeof adapter.getInvoiceStates === "function" && bookedInvoiceId && action !== "mark_paid" && action !== "credit_invoice") {
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
        external_id: externalId,
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