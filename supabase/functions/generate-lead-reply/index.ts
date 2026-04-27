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
      venlig: "Brug en varm, personlig og imødekommende tone. Skriv som en menneskelig kollega.",
      professionel: "Brug en professionel, kompetent og tillidsvækkende tone. Hold det kort og klart.",
      kort: "Hold svaret meget kort (3-5 linjer). Direkte til sagen, ingen smalltalk.",
      detaljeret: "Vær grundig — stil 2-3 konkrete spørgsmål for at kunne give et præcist tilbud.",
    };

    const systemPrompt = `Du er en hjælpsom assistent for danske håndværkere og servicevirksomheder.
Du skriver KUN på dansk. Du genererer en e-mail som virksomheden kan sende til en potentiel kunde der har anmodet om et tilbud via Serviceydere.dk.

Regler:
- Skriv ALDRIG noget der er forkert eller opfundet (priser, datoer, tilbud).
- Hvis et estimat findes, må du nævne det som "vejledende".
- Slut altid med "Med venlig hilsen\\n${business.name}".
- Ingen markdown, ingen emojis, ingen links.
- ${toneInstruction[tone]}
- Ca. 80–160 ord.`;

    const userPrompt = `Virksomheden:
Navn: ${business.name}
By: ${business.city || "—"}
Beskrivelse: ${business.description || "—"}

Kundens forespørgsel:
Navn: ${qr.customer_name}
Kategori: ${qr.category}
By: ${[qr.zip_code, qr.city].filter(Boolean).join(" ") || "—"}
Beskrivelse: "${qr.description}"
${match.estimated_price ? `Vores foreløbige estimat: ${match.estimated_price}` : ""}

Skriv KUN selve e-mailens brødtekst (ingen emnelinje, ingen "Hej Navn" header — det starter automatisk med en hilsen). Begynd direkte med "Hej ${qr.customer_name},"`;

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
    const draft: string = aiJson?.choices?.[0]?.message?.content?.trim() || "";
    if (!draft) return json(500, { error: "Tomt AI-svar" });

    // Gem udkastet på leadet
    const { error: upErr } = await supabase
      .from("quote_request_matches")
      .update({ ai_draft: draft, ai_draft_generated_at: new Date().toISOString() })
      .eq("id", matchId);
    if (upErr) console.error("Kunne ikke gemme udkast:", upErr);

    return json(200, { draft, tone });
  } catch (e) {
    console.error("generate-lead-reply error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Ukendt fejl" });
  }
});