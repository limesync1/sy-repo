import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { decryptMetaToken } from "../_shared/meta-crypto.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const verifySignature = async (rawBody: string, signature: string | null, secret: string) => {
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  const expected = signature.slice(7);
  if (!/^[0-9a-f]{64}$/i.test(expected)) return false;
  const bytes = Uint8Array.from(expected.match(/.{2}/g) || [], (hex) => Number.parseInt(hex, 16));
  return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(rawBody));
};

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
  const appSecret = Deno.env.get("META_APP_SECRET");
  if (!url || !serviceKey || !encryptionSecret || !appSecret) return json({ error: "Not configured" }, 503);
  const admin = createClient(url, serviceKey);
  const rawBody = await req.text();
  if (!await verifySignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret)) {
    return json({ error: "Invalid signature" }, 401);
  }
  const payload = JSON.parse(rawBody || "{}");
  const changes = Array.isArray(payload?.entry) ? payload.entry.flatMap((entry: any) => entry?.changes || []) : [];

  for (const change of changes) {
    if (change?.field !== "leadgen" || !change?.value?.leadgen_id || !change?.value?.page_id) continue;
    const { data: connection } = await admin.from("meta_connections")
      .select("business_id, access_token_ciphertext, access_token_iv, selected_form_ids, page_name, instagram_account_id, instagram_account_name")
      .eq("page_id", String(change.value.page_id)).eq("lead_ads_enabled", true).maybeSingle();
    if (!connection?.access_token_ciphertext || !connection?.access_token_iv) continue;
    const selectedFormIds = Array.isArray(connection.selected_form_ids) ? connection.selected_form_ids : [];
    if (selectedFormIds.length > 0 && change?.value?.form_id && !selectedFormIds.includes(String(change.value.form_id))) continue;
    const token = await decryptMetaToken(connection.access_token_ciphertext, connection.access_token_iv, encryptionSecret);
    const leadResponse = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(change.value.leadgen_id)}?fields=id,created_time,field_data,form_id,ad_id,adgroup_id,campaign_id,platform&access_token=${encodeURIComponent(token)}`);
    if (!leadResponse.ok) continue;
    const lead = await leadResponse.json();
    const isInstagram = String(lead.platform || "").toLowerCase().startsWith("ig") || String(lead.platform || "").toLowerCase() === "instagram";
    const fields = new Map((lead.field_data || []).map((field: any) => [String(field.name), String(field.values?.[0] || "")]));
    const fullName = fields.get("full_name") || [fields.get("first_name"), fields.get("last_name")].filter(Boolean).join(" ") || "Meta-forespørgsel";
    const description = fields.get("message") || fields.get("job_description") || fields.get("custom_question") || "Forespørgsel indsendt via Meta-annonce";
    const { data: request } = await admin.from("quote_requests").upsert({
      customer_name: fullName,
      customer_email: fields.get("email") || null,
      customer_phone: fields.get("phone_number") || null,
      category: fields.get("service") || fields.get("category") || "Anden service",
      description,
      city: fields.get("city") || null,
      zip_code: fields.get("zip_code") || fields.get("post_code") || null,
      share_contact: true,
      terms_accepted_at: lead.created_time || new Date().toISOString(),
      source: isInstagram ? "instagram" : "facebook",
      source_channel: "lead_ads",
      external_lead_id: String(lead.id),
      external_form_id: lead.form_id ? String(lead.form_id) : null,
      external_campaign_id: lead.campaign_id ? String(lead.campaign_id) : null,
      source_metadata: {
        ad_id: lead.ad_id || null, adgroup_id: lead.adgroup_id || null,
        platform: lead.platform || null,
        page_id: String(change.value.page_id), page_name: connection.page_name || null,
        instagram_id: isInstagram ? connection.instagram_account_id || null : null,
        instagram_name: isInstagram ? connection.instagram_account_name || null : null,
      },
    }, { onConflict: "source,external_lead_id" }).select("id").single();
    if (request?.id) {
      await admin.from("quote_request_matches").upsert({
        quote_request_id: request.id,
        business_id: connection.business_id,
        match_score: 100,
        reason: "Forespørgsel modtaget fra virksomhedens egen Meta-formular",
        status: "new",
      }, { onConflict: "quote_request_id,business_id" });
    }
    await admin.from("meta_connections").update({ last_synced_at: new Date().toISOString(), last_event_at: new Date().toISOString() })
      .eq("business_id", connection.business_id);
  }
  return json({ received: true });
});