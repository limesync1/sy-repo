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
    if (!authHeader) return json(401, { error: "Missing authorization" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json(500, { error: "AI ikke konfigureret" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Ikke logget ind" });

    const body = await req.json().catch(() => ({}));
    const matchId = typeof body?.matchId === "string" ? body.matchId : null;
    const tone = ["venlig", "professionel", "kort", "detaljeret"].includes(body?.tone)
      ? body.tone
      : "professionel";
    if (!matchId) return json(400, { error: "matchId mangler" });

    // Hent lead + tjek ejerskab via RLS
    const { data: match, error: mErr } = await supabase
      .from("quote_request_matches")
      .select(
        "id, business_id, match_score, reason, estimated_price, distance_km, quote_request:quote_requests(customer_name, customer_email, customer_phone, category, description, city, zip_code)"
      )
      .eq("id", matchId)
      .maybeSingle();

    if (mErr || !match) return json(404, { error: "Lead ikke fundet" });

    const { data: business, error: bErr } = await supabase
      .from("businesses")
      .select("name, description, city, phone, email")
      .eq("id", match.business_id)
      .maybeSingle();
    if (bErr || !business) return json(404, { error: "Virksomhed ikke fundet" });

    const qr: any = match.quote_request;
    if (!qr) return json(400, { error: "Forespørgslen findes ikke længere" });

    const toneInstruction: Record<string, string> = {
      venlig: "Brug en varm, personlig og imødekommende tone. Skriv som en menneskelig kollega der virkelig vil hjælpe.",
      professionel: "Brug en professionel, kompetent og tillidsvækkende tone. Hold det fokuseret og klart.",
      kort: "Hold svaret kort og effektivt (4-6 linjer). Direkte til sagen, ingen smalltalk.",
      detaljeret: "Vær grundig og stil 2-3 konkrete, relevante spørgsmål for at kunne give et præcist tilbud.",
    };

    // Saml matchgrund og kontekst
    const desc = String(qr.description || "");
    const urgent = /(haster|hurtigst|asap|akut|i dag|i morgen|denne uge)/i.test(desc);
    const distance = typeof match.distance_km === "number" ? Math.round(match.distance_km) : null;

    const systemPrompt = `Du er en erfaren dansk salgsassistent for håndværkere og servicevirksomheder.
Din opgave: skriv ÉN personlig e-mail som virksomheden kan sende til en potentiel kunde der har anmodet om tilbud via Serviceydere.dk.

VIGTIGE REGLER:
- Skriv KUN på dansk, korrekt og naturligt sprog.
- Personalisér: nævn mindst ÉT konkret detalje fra kundens forespørgsel (fx. type opgave, område, omfang).
- Vis at I har læst forespørgslen — gentag ikke alt, men reflektér det.
- Skriv ALDRIG opdigtede priser, datoer eller tilbud.
- Hvis et estimat er givet, nævn det som "vejledende — endeligt pris efter besigtigelse".
- ${urgent ? "Kunden har travlt — vis at I kan rykke hurtigt og tilbyd konkret hurtig kontakt (fx. ringe i dag/i morgen)." : "Tilbyd et opkald eller besigtigelse for at konkretisere."}
- Skriv naturligt og menneskeligt — IKKE som en formular eller skabelon.
- Slut med opfordring til næste skridt (svar på mailen, ring, book tid).
- Afslut med: "Med venlig hilsen\\n${business.name}"
- INGEN markdown, INGEN emojis, INGEN links, INGEN bullet points.
- ${toneInstruction[tone]}
- Længde: ca. 90–170 ord.

Begynd brødteksten direkte med "Hej ${qr.customer_name},"

Returnér JSON med to felter: "subject" (kort, konkret emnelinje på dansk uden "Re:" eller "Sv:") og "body" (selve e-mailen).`;

    const userPrompt = `=== VIRKSOMHED (afsender) ===
Navn: ${business.name}
By: ${business.city || "—"}
Beskrivelse: ${business.description || "—"}

=== KUNDENS FORESPØRGSEL ===
Navn: ${qr.customer_name}
Servicekategori: ${qr.category}
Område: ${[qr.zip_code, qr.city].filter(Boolean).join(" ") || "—"}${distance !== null ? ` (~${distance} km fra jer)` : ""}
Beskrivelse fra kunden:
"""
${desc}
"""
${match.estimated_price ? `\nForeløbigt estimat fra vores beregner: ${match.estimated_price}` : ""}
${match.reason ? `\nHvorfor I matcher godt (intern AI-vurdering — brug evt. til at fremhæve relevante styrker, men gentag IKKE ordret): ${match.reason}` : ""}
${urgent ? "\nSIGNAL: Kunden virker til at have travlt." : ""}

Generér emnelinje + e-mailtekst nu.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_lead_email",
            description: "Generér emnelinje og brødtekst til lead-svaret",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Kort konkret dansk emnelinje" },
                body: { type: "string", description: "Selve e-mailens brødtekst, dansk, naturlig" },
              },
              required: ["subject", "body"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_lead_email" } },
      }),
    });

    if (aiResp.status === 429) return json(429, { error: "Rate limit — prøv igen om lidt" });
    if (aiResp.status === 402) return json(402, { error: "AI-kreditter opbrugt" });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json(500, { error: "AI fejlede" });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let subject = "";
    let draft = "";
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        subject = String(parsed.subject || "").trim();
        draft = String(parsed.body || "").trim();
      } catch (e) {
        console.error("Could not parse tool args", e);
      }
    }
    if (!draft) {
      // Fallback hvis modellen ikke brugte tool calling
      draft = aiJson?.choices?.[0]?.message?.content?.trim() || "";
    }
    if (!subject) subject = `Tilbud på ${qr.category} fra ${business.name}`;
    if (!draft) return json(500, { error: "Tomt AI-svar" });

    // Gem udkastet på leadet
    const { error: upErr } = await supabase
      .from("quote_request_matches")
      .update({ ai_draft: draft, ai_draft_generated_at: new Date().toISOString() })
      .eq("id", matchId);
    if (upErr) console.error("Kunne ikke gemme udkast:", upErr);

    return json(200, { draft, subject, tone });
  } catch (e) {
    console.error("generate-lead-reply error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Ukendt fejl" });
  }
});