import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Ikke logget ind" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json(500, { error: "AI er ikke konfigureret" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Ikke logget ind" });

    const body = await req.json().catch(() => ({}));
    const serviceName = String(body?.serviceName || "").trim();
    const serviceCategory = body?.serviceCategory ? String(body.serviceCategory) : null;
    const subcategory = body?.subcategory ? String(body.subcategory) : null;
    const currentDescription = String(body?.currentDescription || "").trim();

    if (!currentDescription) return json(400, { error: "Der er ingen beskrivelse at forbedre endnu" });

    const systemPrompt = `Du forbedrer korte, professionelle service-beskrivelser på dansk til en marketplace, hvor private og virksomheder bestiller serviceydelser.

Din opgave: omskriv/forbedre den EKSISTERENDE beskrivelse — bevar kernebudskabet og de konkrete detaljer kunden allerede har skrevet, men gør sproget klarere, mere konkret og mere tillidsvækkende.

Krav:
- 2-4 sætninger, max 420 tegn
- Ret stavefejl og grammatik, fjern klichéer ("vi går op i kvalitet", "din tilfredshed er vores prioritet")
- Behold konkrete detaljer/fakta fra originalen (fx hvad der er inkluderet, garanti, varighed)
- Skriv i 1. person flertal (vi/os)
- INGEN priser, INGEN emojis, INGEN markdown, INGEN udråbstegn
- Returnér KUN den forbedrede beskrivelse — ingen indledning eller forklaring`;

    const userPrompt = `Service: ${serviceName || "(uden navn)"}${serviceCategory ? ` | Kategori: ${serviceCategory}` : ""}${subcategory ? ` | Underkategori: ${subcategory}` : ""}

Nuværende beskrivelse:
"""
${currentDescription}
"""

Forbedr denne beskrivelse.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
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

    if (aiResp.status === 429) return json(429, { error: "For mange forespørgsler lige nu — prøv igen om lidt" });
    if (aiResp.status === 402) return json(402, { error: "AI-kreditter er opbrugt — kontakt support" });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json(500, { error: "AI-tjenesten fejlede — prøv igen" });
    }

    const aiJson = await aiResp.json();
    const improved = String(aiJson?.choices?.[0]?.message?.content || "").trim();
    if (!improved) return json(500, { error: "Fik et tomt svar fra AI" });

    return json(200, { description: improved });
  } catch (e) {
    console.error("improve-service-description error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Ukendt fejl" });
  }
});
