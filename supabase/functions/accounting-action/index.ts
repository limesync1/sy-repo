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
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { documentMailKey, mayCancelAppointment, shouldCreateCredit } from '../_shared/accounting/action-rules.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

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

    const parsed = z.object({ order_id: z.string().uuid(), action: z.enum(['check_capabilities','resend_invoice','download_invoice','sync_now','send_reminder','credit_invoice','void_draft','mark_paid','cancel_appointment']), params: z.object({ stop_id: z.string().uuid().optional(), credit_mode: z.enum(['now','office']).optional(), amount: z.number().positive().optional(), paid_at: z.string().datetime().optional(), reason: z.string().max(2000).nullable().optional() }).optional() }).safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Ugyldig handling eller oplysninger' }, 400);
    const { order_id, params } = parsed.data;
    let action: string = parsed.data.action;
    const cancellation = action === 'cancel_appointment';

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order } = await admin.from("orders")
      .select("id, business_id, invoice_external_id, total_amount, customer_email, customer_id, customer_name, payment_status, status, credit_note_external_id, credit_note_external_number")
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
        .select("id, business_id, is_active")
        .eq("user_id", auth.userId)
        .eq("business_id", order.business_id)
        .maybeSingle();
      isEmployee = !!emp && emp.is_active === true;
    }
    // Kunden der ejer ordren må også downloade sin egen faktura + probe caps.
    const isCustomer = !!order.customer_id && order.customer_id === auth.userId;
    if (!isOwner && !isEmployee && !isCustomer) return json({ error: "Forbidden" }, 403);
    if (isCustomer && !isOwner && !isEmployee
        && action !== "download_invoice" && action !== "check_capabilities") {
      return json({ error: "Forbidden" }, 403);
    }
    if (cancellation) {
      if (!params?.stop_id || !params.credit_mode) return json({ error: 'Vælg aftale og kreditnota' }, 400);
      const { data: context, error } = await userClient.rpc('_employee_stop_context', { _stop_id: params.stop_id });
      if (error || !mayCancelAppointment(isOwner, context?.[0]?.order_id ?? null, order_id)) return json({ error: 'Du har ikke adgang til denne aftale' }, 403);
      if (context?.[0]?.order_id !== order_id) return json({ error: 'Aftalen hører ikke til dette stop' }, 403);
      if (params.credit_mode === 'office') {
        const { data, error: cancelError } = await userClient.rpc('employee_cancel_appointment', { _stop_id: params.stop_id, _credit_mode: 'office' });
        if (cancelError) return json({ error: cancelError.message }, 400);
        return json({ ok: true, ...data });
      }
      action = 'credit_invoice';
    }
    if (!isOwner && !isCustomer && !cancellation && action !== "resend_invoice" && action !== "check_capabilities") {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: integ } = await admin.from("accounting_integrations")
      .select("*").eq("business_id", order.business_id).eq("is_active", true).maybeSingle();

    const { data: link } = integ
      ? await admin.from("accounting_order_links")
        .select("external_id, external_type").eq("business_id", order.business_id)
        .eq("provider", integ.provider).eq("order_id", order_id).maybeSingle()
      : { data: null } as any;

    const localInvoiceType: "invoice_booked" | "invoice_draft" | null =
      link?.external_type === "invoice_draft" || link?.external_type === "invoice_booked"
        ? link.external_type
        : order.invoice_external_id ? "invoice_booked" : null;
    const bookedInvoiceId = localInvoiceType === "invoice_booked"
      ? (order.invoice_external_id ?? link?.external_id ?? null)
      : null;
    const externalId = order.invoice_external_id ?? link?.external_id ?? null;
    const sendDocument = async (adapter: ReturnType<typeof makeAdapter>, documentId: string, isCredit: boolean) => {
      if (!order.customer_email || !z.string().email().safeParse(order.customer_email).success) throw new Error('Kunden mangler en gyldig e-mailadresse.');
      if (!adapter.getInvoicePdf) throw new Error('Regnskabsprogrammet kan ikke levere dokumentet.');
      const pdf = await adapter.getInvoicePdf({ invoice_external_id: documentId, external_type: 'invoice_booked' });
      const bytes = Uint8Array.from(atob(pdf.pdf_base64), c => c.charCodeAt(0));
      const path = `${order.business_id}/${order.id}/${isCredit ? 'credit' : 'invoice'}-${documentId}.pdf`;
      const storage = admin.storage.from('accounting-documents');
      const { error: uploadError } = await storage.upload(path, bytes, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;
      const { data: signed, error: linkError } = await storage.createSignedUrl(path, 7 * 86400);
      if (linkError || !signed) throw new Error('Dokumentlinket kunne ikke oprettes.');
      const { data: business } = await admin.from('businesses').select('name,email').eq('id', order.business_id).single();
      return sendTemplateEmail('accounting-document', order.customer_email, {
        idempotencyKey: documentMailKey(order.id, documentId, isCredit, Date.now()),
        replyTo: business?.email || undefined,
        templateData: { customerName: order.customer_name, businessName: business?.name, documentNumber: documentId, amount: Number(order.total_amount), downloadUrl: signed.signedUrl, isCredit },
      });
    };
    const finalize = async (adapter: ReturnType<typeof makeAdapter>) => {
      if (localInvoiceType === 'invoice_booked' && externalId) return externalId;
      if (!link?.external_id || !adapter.finalizeInvoice || !['order','invoice_draft'].includes(link.external_type)) throw new Error('Fakturaen findes ikke i regnskabsprogrammet endnu.');
      const fin = await adapter.finalizeInvoice({ external_id: link.external_id, external_type: link.external_type as 'order' | 'invoice_draft' });
      const { error: linkError } = await admin.from('accounting_order_links').update({ external_id: fin.invoice_external_id, external_number: fin.invoice_external_number ?? fin.invoice_external_id, external_type: 'invoice_booked', last_status_synced: 'booked' }).eq('business_id',order.business_id).eq('provider',integ.provider).eq('order_id',order_id);
      if (linkError) throw linkError;
      const { error: orderError } = await admin.from('orders').update({ invoice_external_id: fin.invoice_external_id, invoice_external_number: fin.invoice_external_number ?? fin.invoice_external_id, invoice_status: 'booked', invoiced_at: new Date().toISOString() }).eq('id', order_id);
      if (orderError) throw orderError;
      return fin.invoice_external_id;
    };

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
      // Lokalt fallback — uden integration kan ejeren stadig markere
      // ordren som betalt manuelt (gemmes i Serviceydere). Det sikrer at
      // 3-prikker-menuen altid har mindst én handling at vise.
      const isUnpaid = order.payment_status !== "paid" && order.payment_status !== "credited";
      const isCancelled = order.status === "cancelled";
      if (isOwner && isUnpaid && !isCancelled) caps.can_mark_paid = true;
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
        if (localInvoiceType === "invoice_booked") {
          caps.is_booked = true;
          caps.can_resend = typeof adapter.resendInvoice === "function";
          caps.can_download_pdf = typeof adapter.getInvoicePdf === "function";
        } else if (localInvoiceType === "invoice_draft") {
          caps.is_draft = true;
          caps.can_download_pdf = typeof adapter.getInvoicePdf === "function";
        } else {
          // External link er en ordre/kladdeordre — der findes endnu ingen faktura
          // at downloade. Kreditering bogfører først ordren.
          caps.can_credit = link?.external_type === "order"
            && typeof adapter.finalizeInvoice === "function"
            && typeof adapter.creditInvoice === "function"
            && order.payment_status !== "credited" && !isCancelled;
        }
      }
      try {
        // Slå kun fakturatilstand op hvis vi rent faktisk har et FAKTURA-ID.
        // Hvis link kun peger på en ordre/kladdeordre, ville et opslag mod
        // /invoices/... give 404 og fejlagtigt tænde caps.
        if (localInvoiceType && externalId && typeof adapter.getInvoiceStates === "function") {
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
            caps.can_credit = (isBooked || (isDraft && typeof adapter.finalizeInvoice === "function"))
              && typeof adapter.creditInvoice === "function"
              && s.status !== "credited" && order.payment_status !== "credited";
            caps.can_mark_paid = (isBooked || (isDraft && typeof adapter.finalizeInvoice === "function"))
              && typeof adapter.markInvoicePaid === "function"
              && !fullyPaid;
            caps.can_void = isDraft && typeof adapter.voidDraft === "function";
            caps.can_download_pdf = typeof adapter.getInvoicePdf === "function";
            caps.can_resend = isBooked && typeof adapter.resendInvoice === "function";
          }
        } else if (link?.external_id && link?.external_type?.startsWith("invoice") && typeof adapter.voidDraft === "function") {
          // Kladde — kan annulleres
          caps.exists_in_provider = true;
          caps.is_draft = true;
          caps.can_void = true;
          caps.can_download_pdf = typeof adapter.getInvoicePdf === "function";
        }
      } catch { /* ignorer — vi har stadig fallback-caps fra externalId-blokken ovenfor */ }
      caps.can_resend = !!externalId && !!adapter.getInvoicePdf && !!order.customer_email && (localInvoiceType === 'invoice_booked' || !!adapter.finalizeInvoice) && order.payment_status !== 'credited';
      return json({ ok: true, caps });
    }

    // Gensend en bogført faktura til kunden via udbyderens egen e-mail-flow.
    // Bruges fra medarbejderpanelet når en aftale er markeret udført.
    if (action === "resend_invoice") {
      if (!integ) return json({ error: "Ingen aktiv regnskabsintegration" }, 400);
      const adapter = makeAdapter(integ.provider, integ as any, integ.settings ?? {});
      let sendId = externalId;
      try {
        sendId = await finalize(adapter);
        const res = await sendDocument(adapter, sendId, false);
        if (!res.sent) return json({ ok: true, sent: false, note: 'Kunden har fravalgt mails eller adressen er blokeret. Mailen blev ikke sendt.' });
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
      if (!localInvoiceType) {
        return json({ error: "Der er endnu ingen faktura at downloade — aftalen er kun pushet som ordre. Markér aftalen som udført for at danne fakturaen." }, 404);
      }
      const pdfId = bookedInvoiceId ?? link?.external_id ?? null;
      if (!pdfId) return json({ error: "Fakturaen findes ikke i regnskabsprogrammet endnu." }, 404);
      let externalType: "invoice_booked" | "invoice_draft" = localInvoiceType;
      if (typeof adapter.getInvoiceStates === "function") {
        const states = await adapter.getInvoiceStates([pdfId]).catch(() => []);
        const raw = (states?.[0] as any)?.raw ?? {};
        const providerType: "invoice_booked" | "invoice_draft" | null = raw?.bookedInvoiceNumber != null
          ? "invoice_booked"
          : raw?.draftInvoiceNumber != null ? "invoice_draft" : null;
        if (providerType) {
          externalType = providerType;
          if (providerType !== localInvoiceType) {
            await admin.from("accounting_order_links").update({
              external_type: providerType,
              last_status_synced: providerType === "invoice_draft" ? "draft" : "booked",
            }).eq("business_id", order.business_id).eq("provider", integ.provider).eq("order_id", order_id);
            await admin.from("orders").update({
              invoice_status: providerType === "invoice_draft" ? "draft" : "booked",
            }).eq("id", order_id);
          }
        }
      }
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
        let creditId = order.credit_note_external_id;
        let creditNumber = order.credit_note_external_number;
        if (shouldCreateCredit(order.payment_status)) {
          const toCredit = await finalize(adapter);
          const res = await adapter.creditInvoice({ invoice_external_id: toCredit, reason: params?.reason ?? null });
          creditId = res.credit_note_external_id;
          creditNumber = res.credit_note_external_number;
          const { error } = await admin.from('orders').update({ payment_status: 'credited', credited_at: new Date().toISOString(), credit_note_external_id: creditId, credit_note_external_number: creditNumber }).eq('id',order_id);
          if (error) throw error;
        }
        if (!creditId) throw new Error('Kreditnotaens nummer mangler. Kontakt kontoret.');
        let note: string | undefined;
        try {
          const mail = await sendDocument(adapter, creditId, true);
          if (!mail.sent) note = 'Kreditnotaen er oprettet, men kunden har fravalgt mails eller adressen er blokeret.';
        } catch (error) {
          note = 'Kreditnotaen er oprettet, men mailen kunne ikke sendes. Prøv Kreditér igen for at gensende uden at oprette en ny kreditnota.';
          console.error('credit document email failed', error instanceof Error ? error.message : 'send failed');
        }
        if (cancellation && params?.stop_id) {
          const { error } = await userClient.rpc('employee_cancel_appointment', { _stop_id: params.stop_id, _credit_mode: 'now' });
          if (error) throw error;
        }
        result = { ok: true, credit_note: { credit_note_external_id: creditId, credit_note_external_number: creditNumber }, cancelled: cancellation, note };
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
        let invoiceToPay = bookedInvoiceId;
        if (!invoiceToPay && link?.external_id && typeof adapter.finalizeInvoice === "function"
            && (link.external_type === "order" || link.external_type === "invoice_draft")) {
          // Betaling kan kun registreres på en bogført faktura — bogfør først.
          const fin = await adapter.finalizeInvoice({
            external_id: link.external_id,
            external_type: link.external_type as "order" | "invoice_draft",
          });
          invoiceToPay = fin.invoice_external_id;
          await admin.from("accounting_order_links").update({
            external_id: fin.invoice_external_id,
            external_number: fin.invoice_external_number ?? fin.invoice_external_id,
            external_type: "invoice_booked",
            last_status_synced: "booked",
          }).eq("business_id", order.business_id).eq("provider", integ.provider).eq("order_id", order_id);
          await admin.from("orders").update({
            invoice_external_id: fin.invoice_external_id,
            invoice_external_number: fin.invoice_external_number ?? fin.invoice_external_id,
            invoice_status: "booked",
            invoiced_at: new Date().toISOString(),
          }).eq("id", order_id);
        }
        if (!invoiceToPay) {
          result = await markPaidLocally(amount, paidAt, "Betalingen er registreret i Serviceydere. Fakturaen er ikke bogført endnu, så der var intet at markere i regnskabsprogrammet.");
        } else {
          if (typeof adapter.markInvoicePaid !== "function") {
            return json({ error: `${integ.provider} understøtter ikke manuel betalingsmarkering via API` }, 400);
          }
          await adapter.markInvoicePaid({
            invoice_external_id: invoiceToPay,
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