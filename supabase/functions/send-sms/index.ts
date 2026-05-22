// Sender SMS via central Twilio-konto.
// Body: { to: string (E.164 eller dansk fmt), message: string }
// Afsender er altid "Serviceyder" (centralt for hele platformen).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function normalizeDanish(phone: string): string {
  const trimmed = phone.replace(/[\s\-()]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return "+" + trimmed.slice(2);
  // 8 cifre = dansk lokalt nummer
  if (/^\d{8}$/.test(trimmed)) return "+45" + trimmed;
  return trimmed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: require authenticated user OR service role (intern kald fra andre functions).
    const authHeader = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const isService = serviceKey && authHeader === `Bearer ${serviceKey}`;
    if (!isService) {
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await supa.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY mangler");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY mangler");
    const FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
    if (!FROM_NUMBER) throw new Error("TWILIO_FROM_NUMBER mangler — tilføj dit købte Twilio-nummer i E.164 format");

    const { to, message } = await req.json();
    if (!to || typeof to !== "string") throw new Error("'to' er påkrævet");
    if (!message || typeof message !== "string") throw new Error("'message' er påkrævet");

    const toE164 = normalizeDanish(to);
    if (message.length > 1600) throw new Error("Beskeden er for lang");

    const body = new URLSearchParams({
      To: toE164,
      From: FROM_NUMBER,
      Body: message,
    });

    const r = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = await r.json();
    if (!r.ok) {
      throw new Error(`Twilio-fejl [${r.status}]: ${data?.message ?? JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ ok: true, sid: data.sid, status: data.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("send-sms error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});