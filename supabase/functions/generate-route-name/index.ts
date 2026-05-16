import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fallbackName = (customerName?: string, serviceSummary?: string, city?: string) => {
  const base = (customerName || "Aftale").trim().split(/\s+/).slice(0, 2).join(" ");
  if (city) return `${base} · ${city}`;
  if (serviceSummary) return `${base} · ${serviceSummary.split(",")[0].trim().slice(0, 20)}`;
  return base;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const customerName: string | undefined = body?.customerName;
    const serviceSummary: string | undefined = body?.serviceSummary;
    const city: string | undefined = body?.city;
    const address: string | undefined = body?.address;

    if (!customerName || !String(customerName).trim()) {
      return json(200, { name: fallbackName(customerName, serviceSummary, city) });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json(200, { name: fallbackName(customerName, serviceSummary, city) });
    }

    const systemPrompt = `Du genererer KORTE, sigende rutenavne på dansk til en ruteplanlægger.
Krav:
- Maks 28 tegn
- Format: "<Kundenavn eller kort beskrivelse> · <by eller ydelse>" — brug "·" som separator
- Ingen anførselstegn, ingen punktum til sidst, ingen emojis, ingen markdown
- Brug kun den medfølgende information — opfind ikke data
- Returnér KUN selve navnet, intet andet`;

    const userPrompt = `Lav et rutenavn til en flyttet aftale.
Kunde: ${customerName}
Ydelse: ${serviceSummary || "(ukendt)"}
By: ${city || "(ukendt)"}
Adresse: ${address || "(ukendt)"}`;

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 4500);
    let aiResponse: Response;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: ac.signal,
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
    } catch (e) {
      clearTimeout(timeout);
      console.warn("generate-route-name AI timeout/fejl", e);
      return json(200, { name: fallbackName(customerName, serviceSummary, city) });
    }
    clearTimeout(timeout);

    if (!aiResponse.ok) {
      return json(200, { name: fallbackName(customerName, serviceSummary, city) });
    }

    const data = await aiResponse.json();
    let name = String(data?.choices?.[0]?.message?.content ?? "").trim();
    name = name.replace(/^["'`]+|["'`.]+$/g, "").trim();
    if (!name) name = fallbackName(customerName, serviceSummary, city);
    if (name.length > 40) name = name.slice(0, 40).trim();

    return json(200, { name });
  } catch (e) {
    console.error("generate-route-name error:", e);
    return json(200, { name: "Ny rute" });
  }
});