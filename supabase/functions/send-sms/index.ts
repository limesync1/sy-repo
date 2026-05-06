// Sender SMS via central Twilio-konto.
// Body: { to: string (E.164 eller dansk fmt), from: string (alfanumerisk afsender, max 11 tegn), message: string }
// Bruges af customer-notifications-dispatch — virksomhedens "from" indtastes i deres indstillinger.
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

function sanitizeSender(s: string): string {
  // Twilio alfanumerisk: A-Z, a-z, 0-9, mellemrum. Max 11 tegn.
  return s.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 11);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY mangler");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY mangler");

    const { to, from, message } = await req.json();
    if (!to || typeof to !== "string") throw new Error("'to' er påkrævet");
    if (!from || typeof from !== "string") throw new Error("'from' er påkrævet");
    if (!message || typeof message !== "string") throw new Error("'message' er påkrævet");

    const toE164 = normalizeDanish(to);
    const fromSender = sanitizeSender(from);
    if (!fromSender) throw new Error("Ugyldigt afsendernavn");
    if (message.length > 1600) throw new Error("Beskeden er for lang");

    const body = new URLSearchParams({
      To: toE164,
      From: fromSender,
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