// Customer notifications dispatcher
// Reads pending rows from public.customer_notification_queue whose send_at <= now()
// and sends through the managed email API using the business's saved
// template (or a sensible default) with placeholder substitution.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULTS: Record<string, { subject: string; body: string }> = {
  service_completed: {
    subject: "Vi har udført {{service}}",
    body: "Hej {{kundens_navn}},\n\nVi har i dag været forbi og udført {{service}}.\nDu modtager snarest faktura via vores regnskabssystem.\n\nTak fordi du valgte os.\n\nVenlig hilsen,\n{{firmanavn}}",
  },
};

const SMS_DEFAULTS: Record<string, { body: string }> = {
  service_completed: {
    body: "Hej {{kundens_navn}}, vi har udført {{service}} i dag. Faktura sendes snarest. Mvh {{firmanavn}}",
  },
};

// Footer der automatisk tilføjes til alle SMS'er — fortæller kunden hvem
// de skal kontakte (afsender = "Serviceyder" og kan ikke besvares).
function buildSmsFooter(businessName: string, businessPhone: string | null): string {
  const name = businessName?.trim() || "virksomheden";
  if (businessPhone && businessPhone.trim()) {
    return `\n\nDenne SMS kan ikke besvares. Kontakt ${name} på ${businessPhone.trim()}.`;
  }
  return `\n\nDenne SMS kan ikke besvares. Kontakt ${name} direkte.`;
}

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // Kun cron/serveren må dræne køen (den sender rigtige mails/SMS).
  const authHeader = req.headers.get("Authorization") || "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
  const authorized =
    (!!CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) ||
    (!!SERVICE_KEY && authHeader === `Bearer ${SERVICE_KEY}`);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date().toISOString();
  const { data: jobs, error } = await admin
    .from("customer_notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", now)
    .order("send_at", { ascending: true })
    .limit(50);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  let sent = 0; let failed = 0;
  for (const job of jobs ?? []) {
    try {
      // Hent virksomhed + ordre + service-navn + medarbejder
      const [bizRes, orderRes, stopRes] = await Promise.all([
        admin.from("businesses").select("id, name, phone, settings, notification_settings").eq("id", job.business_id).maybeSingle(),
        admin.from("orders").select("id, customer_name, customer_email").eq("id", job.order_id).maybeSingle(),
        job.route_stop_id
          ? admin.from("route_stops").select("service_summary").eq("id", job.route_stop_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const biz = bizRes.data;
      const order = orderRes.data;
      const stop = stopRes.data as any;
      if (!biz || !order) {
        await admin.from("customer_notification_queue").update({
          status: "cancelled", last_error: "Ordre eller virksomhed ikke fundet",
        }).eq("id", job.id);
        continue;
      }

      // Påmindelser med planlagt tidspunkt er udfaset — send dem aldrig.
      if (job.event_type === "service_upcoming") {
        await admin.from("customer_notification_queue").update({
          status: "cancelled", last_error: "Påmindelse med tidspunkt er udfaset",
        }).eq("id", job.id);
        continue;
      }

      // Tjek at virksomheden ikke har slået denne event-type fra
      const notifSettings = (biz.notification_settings as any) || {};
      const disabledKey = `customer_${job.event_type}_disabled`;
      if (notifSettings[disabledKey] === true) {
        await admin.from("customer_notification_queue").update({
          status: "cancelled", last_error: "Slået fra af virksomheden",
        }).eq("id", job.id);
        continue;
      }

      // Tjek modtagerens egne notifikations-præferencer (profiles.notification_settings).
      // Mapper event_type → præference-nøgle. Hvis modtageren har slået den fra,
      // annulleres jobbet uden afsendelse.
      const EVENT_TO_PREF: Record<string, string> = {
        service_upcoming: "email_upcoming_service",
        service_completed: "email_agreement_status",
      };
      const prefKey = EVENT_TO_PREF[job.event_type];
      const recipientEmail = job.recipient_email ?? order.customer_email ?? null;
      if (prefKey && recipientEmail) {
        const { data: allowed } = await admin.rpc("get_customer_notification_pref", {
          p_email: recipientEmail,
          p_key: prefKey,
        });
        if (allowed === false) {
          await admin.from("customer_notification_queue").update({
            status: "cancelled",
            last_error: "Slået fra af modtageren",
          }).eq("id", job.id);
          continue;
        }
      }

      // Find skabelon
      const channel: "email" | "sms" = (job.channel as any) ?? "email";
      const { data: tpl } = await admin
        .from("customer_notification_templates")
        .select("subject, body, enabled")
        .eq("business_id", job.business_id)
        .eq("event_type", job.event_type)
        .eq("channel", channel)
        .maybeSingle();
      if (tpl && tpl.enabled === false) {
        await admin.from("customer_notification_queue").update({
          status: "cancelled", last_error: "Skabelon deaktiveret",
        }).eq("id", job.id);
        continue;
      }
      // ─── Hent overrides: aftale-niveau (subscription) > kunde-niveau (email) ───
      // Find tilknyttet abonnement (hvis aftale-override findes for det)
      const { data: sub } = await admin
        .from("subscriptions")
        .select("id")
        .eq("order_id", job.order_id)
        .maybeSingle();

      const recipientForOverride = job.recipient_email ?? order.customer_email ?? null;
      const { data: overrides } = await admin
        .from("notification_overrides")
        .select("scope, enabled, subject, body, lead_time_minutes")
        .eq("business_id", job.business_id)
        .eq("event_type", job.event_type)
        .eq("channel", channel)
        .or([
          sub?.id ? `and(scope.eq.agreement,subscription_id.eq.${sub.id})` : null,
          recipientForOverride ? `and(scope.eq.customer,customer_email.eq.${recipientForOverride.toLowerCase()})` : null,
        ].filter(Boolean).join(","));

      const agreementOv = overrides?.find((o: any) => o.scope === "agreement") ?? null;
      const customerOv  = overrides?.find((o: any) => o.scope === "customer")  ?? null;

      // Effektiv enabled: aftale > kunde > skabelon
      const effectiveEnabled = agreementOv?.enabled ?? customerOv?.enabled ?? (tpl?.enabled ?? true);
      if (effectiveEnabled === false) {
        await admin.from("customer_notification_queue").update({
          status: "cancelled",
          last_error: agreementOv?.enabled === false
            ? "Slået fra på aftale-niveau"
            : "Slået fra på kunde-niveau",
        }).eq("id", job.id);
        continue;
      }

      const subjectTpl = agreementOv?.subject ?? customerOv?.subject ?? tpl?.subject ?? DEFAULTS[job.event_type]?.subject ?? "Besked";
      const defaultBody = channel === "sms"
        ? (SMS_DEFAULTS[job.event_type]?.body ?? "")
        : (DEFAULTS[job.event_type]?.body ?? "");
      const bodyTpl = agreementOv?.body ?? customerOv?.body ?? tpl?.body ?? defaultBody;

      // Understøt både dansk (nye) og engelsk (gamle) variabel-navne
      const customerName = order.customer_name ?? "kunde";
      const businessName = biz.name ?? "";
      const businessPhone = (biz as any).phone ?? "";
      const serviceName = stop?.service_summary ?? "din service";
      const vars: Record<string, string> = {
        // Danske navne
        kundens_navn: customerName,
        firmanavn: businessName,
        telefon: businessPhone,
        service: serviceName,
        // Bagudkompatibilitet
        customer_name: customerName,
        business_name: businessName,
        business_phone: businessPhone,
        service_name: serviceName,
      };
      const subject = render(subjectTpl, vars);
      let body = render(bodyTpl, vars);
      if (channel === "sms") {
        body = body + buildSmsFooter(biz.name ?? "", (biz as any).phone ?? null);
      }

      await admin.from("customer_notification_queue").update({
        attempts: (job.attempts ?? 0) + 1,
      }).eq("id", job.id);

      if (channel === "sms") {
        const settings = (biz.settings as any) || {};
        const enabled = settings.sms_enabled === true;
        if (!enabled) {
          await admin.from("customer_notification_queue").update({
            status: "cancelled", last_error: "SMS er ikke aktiveret for denne virksomhed",
          }).eq("id", job.id);
          continue;
        }
        if (!job.recipient_phone) {
          await admin.from("customer_notification_queue").update({
            status: "cancelled", last_error: "Mangler kunde-telefonnummer",
          }).eq("id", job.id);
          continue;
        }
        const { data: smsRes, error: smsErr } = await admin.functions.invoke("send-sms", {
          body: { to: job.recipient_phone, message: body },
        });
        if (smsErr) throw new Error(smsErr.message ?? String(smsErr));
        if (smsRes && smsRes.ok === false) throw new Error(smsRes.error ?? "Ukendt SMS-fejl");
      } else {
        const result = await sendTemplateEmail("customer-notification", job.recipient_email, {
          idempotencyKey: `cust-notif-${job.id}`,
          templateData: { subject, body, businessName: biz.name ?? "" },
        });
        if (!result.sent) {
          await admin.from("customer_notification_queue").update({
            status: "cancelled", last_error: "Modtageren kan ikke kontaktes via e-mail",
          }).eq("id", job.id);
          continue;
        }
      }

      await admin.from("customer_notification_queue").update({
        status: "sent", sent_at: new Date().toISOString(), last_error: null,
      }).eq("id", job.id);
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const failedFinal = (job.attempts ?? 0) + 1 >= 5;
      await admin.from("customer_notification_queue").update({
        status: failedFinal ? "failed" : "pending",
        last_error: msg,
        send_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      }).eq("id", job.id);
      failed++;
    }
  }
  return new Response(JSON.stringify({ ok: true, sent, failed, total: jobs?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
