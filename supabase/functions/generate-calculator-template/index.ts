import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_UNITS = ["stk", "m²", "m", "timer", "rum", "km", "kg", "kr"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      serviceName,
      serviceCategory,
      subcategory,
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
    ].filter(Boolean).join(" | ");

    const systemPrompt = `Du opsætter en prisberegner for en service på en dansk marketplace.
Du returnerer 2-5 trin der gør det muligt for kunden at sammensætte en realistisk pris for netop denne service.

Regler for trin:
- Hvert trin skal være MENINGSFULDT for servicen — ikke generiske trin.
- Brug realistiske danske priser i DKK pr. enhed (eksklusiv moms-tankegang er fint).
- Vælg den enhed der passer bedst til trinnet fra denne liste: ${ALLOWED_UNITS.join(", ")}.
- min_value < default_value <= max_value.
- Korte, klare labels på dansk (max 40 tegn). Fx "Antal vinduer", "Boligstørrelse", "Antal rum".
- Tilpas trin og priser til virksomhedens branche, by og beskrivelse hvis tilgængeligt.
- Hvis servicen typisk har et "grundgebyr" — gør første trin til det med min=max=default=1 og prisen som grundgebyr.`;

    const userPrompt = `Lav en prisberegner-opsætning til denne service.\n\nVirksomhed: ${businessLine || "(ingen oplysninger)"}\nService: ${serviceLine}`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "build_calculator",
              description: "Returnér 2-5 prisberegner-trin specifikt tilpasset servicen.",
              parameters: {
                type: "object",
                properties: {
                  steps: {
                    type: "array",
                    minItems: 2,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Kort dansk label, max 40 tegn" },
                        unit: { type: "string", enum: ALLOWED_UNITS },
                        price_per_unit: { type: "number", description: "Pris i DKK pr. enhed" },
                        min_value: { type: "number" },
                        max_value: { type: "number" },
                        default_value: { type: "number" },
                      },
                      required: ["label", "unit", "price_per_unit", "min_value", "max_value", "default_value"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_calculator" } },
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
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) throw new Error("Tomt svar fra AI");

    const parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];

    const steps = rawSteps
      .map((s: any) => {
        const unit = ALLOWED_UNITS.includes(s.unit) ? s.unit : "stk";
        const min = Number(s.min_value);
        const max = Number(s.max_value);
        const def = Number(s.default_value);
        const price = Number(s.price_per_unit);
        return {
          label: String(s.label || "").trim().slice(0, 60),
          unit,
          price_per_unit: Number.isFinite(price) && price >= 0 ? price : 0,
          min_value: Number.isFinite(min) ? min : 0,
          max_value: Number.isFinite(max) ? max : 100,
          default_value: Number.isFinite(def) ? def : (Number.isFinite(min) ? min : 0),
        };
      })
      .filter((s: any) => s.label.length > 0)
      .slice(0, 5);

    if (steps.length === 0) throw new Error("AI returnerede ingen brugbare trin");

    return new Response(JSON.stringify({ steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-calculator-template error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});