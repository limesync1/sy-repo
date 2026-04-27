import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      serviceName,
      serviceCategory,
      subcategory,
      pricingType,
      businessName,
      businessDescription,
      businessCategories,
      businessCity,
    } = body || {};

    if (!serviceName || !String(serviceName).trim()) {
      return new Response(JSON.stringify({ error: "serviceName er påkrævet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ikke konfigureret");

    const businessLine = [
      businessName ? `Navn: ${businessName}` : null,
      Array.isArray(businessCategories) && businessCategories.length > 0
        ? `Brancher: ${businessCategories.join(", ")}`
        : null,
      businessCity ? `By: ${businessCity}` : null,
      businessDescription ? `Beskrivelse: ${businessDescription}` : null,
    ].filter(Boolean).join(" | ");

    const serviceLine = [
      `Servicenavn: ${serviceName}`,
      serviceCategory ? `Kategori: ${serviceCategory}` : null,
      subcategory ? `Underkategori: ${subcategory}` : null,
      pricingType ? `Prismodel: ${pricingType}` : null,
    ].filter(Boolean).join(" | ");

    const systemPrompt = `Du skriver korte, professionelle service-beskrivelser på dansk til en marketplace, hvor private og virksomheder bestiller serviceydelser.

Krav:
- 2-3 sætninger, max 380 tegn
- Konkret og tillidsvækkende, INGEN klichéer ("vi går op i kvalitet", "din tilfredshed er vores prioritet", "kvalitet i højsædet" osv.)
- Skriv i 1. person flertal (vi/os) ud fra virksomhedens perspektiv
- Sætning 1: hvad servicen er + hvad den konkret inkluderer (nævn 2-3 specifikke elementer)
- Sætning 2-3: hvem den passer til + hvad kunden kan forvente (varighed, garanti, eller anden konkret fordel)
- Brug branchespecifikke termer (fx "rentvandsanlæg" for vinduer, "K-mærket" for rengøring) når relevant
- Tilpas tone til virksomhedens by og branche — privat = varm/personlig, erhverv = saglig/professionel
- Tilpas tonen til virksomhedens egen beskrivelse, hvis den findes
- INGEN priser, INGEN emojis, INGEN markdown, INGEN udråbstegn
- Returnér KUN beskrivelsen — ingen indledning eller forklaring`;

    const userPrompt = `Generér én beskrivelse til denne service.

Virksomhed: ${businessLine || "(ingen oplysninger)"}
Service: ${serviceLine}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditter opbrugt." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI-generering fejlede");
    }

    const aiData = await aiResponse.json();
    const description = (aiData.choices?.[0]?.message?.content ?? "").trim();

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-service-description error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});