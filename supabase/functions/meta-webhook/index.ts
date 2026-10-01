import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { decryptMetaToken } from "../_shared/meta-crypto.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestUrl = new URL(req.url);
  if (req.method === "GET") {
    const verifyToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");
    if (requestUrl.searchParams.get("hub.mode") === "subscribe" && requestUrl.searchParams.get("hub.verify_token") === verifyToken) {
      return new Response(requestUrl.searchParams.get("hub.challenge") || "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionSecret = Deno.env.get("META_TOKEN_ENCRYPTION_KEY");
  if (!url || !serviceKey || !encryptionSecret) return json({ error: "Not configured" }, 503);
  const admin = createClient(url, serviceKey);
  const payload = await req.json().catch(() => ({}));
  const changes = Array.isArray(payload?.entry) ? payload.entry.flatMap((entry: any) => entry?.changes || []) : [];

  for (const change of changes) {
    if (change?.field !== "leadgen" || !change?.value?.leadgen_id || !change?.value?.page_id) continue;
    const { data: connection } = await admin.from("meta_connections")
      .select("business_id, access_token_ciphertext, access_token_iv")
      .eq("page_id", String(change.value.page_id)).eq("lead_ads_enabled", true).maybeSingle();
    if (!connection?.access_token_ciphertext || !connection?.access_token_iv) continue;
    const token = await decryptMetaToken(connection.access_token_ciphertext, connection.access_token_iv, encryptionSecret);
    const leadResponse = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(change.value.leadgen_id)}?fields=id,created_time,field_data,form_id,ad_id,adgroup_id,campaign_id&access_token=${encodeURIComponent(token)}`);
    if (!leadResponse.ok) continue;
    const lead = await leadResponse.json();
    const fields = new Map((lead.field_data || []).map((field: any) => [String(field.name), String(field.values?.[0] || "")]));
    const fullName = fields.get("full_name") || [fields.get("first_name"), fields.get("last_name")].filter(Boolean).join(" ") || "Meta lead";
    const description = fields.get("message") || fields.get("job_description") || fields.get("custom_question") || "Lead indsendt via Meta Lead Ads";
    await admin.from("quote_requests").upsert({
      customer_name: fullName,
      customer_email: fields.get("email") || null,
      customer_phone: fields.get("phone_number") || null,
      category: fields.get("service") || fields.get("category") || "Anden service",
      description,
      city: fields.get("city") || null,
      zip_code: fields.get("zip_code") || fields.get("post_code") || null,
      share_contact: true,
      terms_accepted_at: lead.created_time || new Date().toISOString(),
      source: "facebook",
      source_channel: "lead_ads",
      external_lead_id: String(lead.id),
      external_form_id: lead.form_id ? String(lead.form_id) : null,
      external_campaign_id: lead.campaign_id ? String(lead.campaign_id) : null,
      source_metadata: { ad_id: lead.ad_id || null, adgroup_id: lead.adgroup_id || null },
    }, { onConflict: "source,external_lead_id" });
    await admin.from("meta_connections").update({ last_synced_at: new Date().toISOString(), last_event_at: new Date().toISOString() })
      .eq("business_id", connection.business_id);
  }
  return json({ received: true });
});