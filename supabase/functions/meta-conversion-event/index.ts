import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { decryptMetaToken } from "../_shared/meta-crypto.ts";
import { requireAuthenticatedUser } from "../_shared/auth.ts";

const Body = z.object({
  businessId: z.string().uuid(),
  eventId: z.string().min(8).max(200),
  eventName: z.enum(["Lead", "Schedule", "Purchase"]),
  eventSourceUrl: z.string().url().max(2000),
  consentGranted: z.literal(true),
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Ugyldig eller manglende samtykke" }, 400);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionSecret = Deno.env.get("META_TOKEN_ENCRYPTION_KEY");
  if (!url || !serviceKey || !encryptionSecret) return json({ error: "Not configured" }, 503);
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) return json({ error: "Not configured" }, 503);
  // Only the business owner (or a platform admin) may send events for a business.
  const auth = await requireAuthenticatedUser(req, url, anonKey);
  if (!("userClient" in auth)) return json({ error: auth.error }, auth.status);
  const admin = createClient(url, serviceKey);
  const [{ data: owned }, { data: isAdmin }] = await Promise.all([
    admin.from("businesses").select("id").eq("id", parsed.data.businessId).eq("owner_id", auth.userId).maybeSingle(),
    admin.rpc("has_role", { _user_id: auth.userId, _role: "admin" }),
  ]);
  if (!owned && !isAdmin) return json({ error: "Ingen adgang" }, 403);
  const { data: connection } = await admin.from("meta_connections")
    .select("pixel_id, access_token_ciphertext, access_token_iv, conversions_api_enabled")
    .eq("business_id", parsed.data.businessId).eq("status", "connected").maybeSingle();
  if (!connection?.conversions_api_enabled || !connection.pixel_id || !connection.access_token_ciphertext || !connection.access_token_iv) {
    return json({ skipped: true });
  }
  const { error: eventError } = await admin.from("meta_conversion_events").insert({
    business_id: parsed.data.businessId, event_id: parsed.data.eventId, event_name: parsed.data.eventName,
    event_source_url: parsed.data.eventSourceUrl, consent_granted: true,
  });
  if (eventError?.code === "23505") return json({ duplicate: true });
  if (eventError) return json({ error: "Kunne ikke registrere hændelsen" }, 500);
  const token = await decryptMetaToken(connection.access_token_ciphertext, connection.access_token_iv, encryptionSecret);
  const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(connection.pixel_id)}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [{ event_name: parsed.data.eventName, event_time: Math.floor(Date.now() / 1000), event_id: parsed.data.eventId, action_source: "website", event_source_url: parsed.data.eventSourceUrl }] }),
  });
  const details = await response.text();
  await admin.from("meta_conversion_events").update(response.ok
    ? { status: "sent", sent_at: new Date().toISOString(), error_message: null }
    : { status: "failed", error_message: details.slice(0, 1000) }).eq("business_id", parsed.data.businessId).eq("event_id", parsed.data.eventId);
  return response.ok ? json({ sent: true }) : json({ error: "Meta afviste hændelsen" }, 502);
});