import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_UNITS = ["stk", "m²", "m", "timer", "rum", "km", "kg", "kr"];

// Kategori-specifikke retningslinjer som AI'en bruger til at lave realistiske trin.
// Hver branche har eksempler på TYPISKE trin, enheder og prisleje i DKK pr. enhed.
// Dette gør at AI'en ikke bare gætter, men følger dansk markedspraksis.
const CATEGORY_GUIDELINES: Record<string, string> = {
  "Rengøring": `BRANCHE: Rengøring (privat & erhverv).
Typiske trin:
- "Boligstørrelse" — m², 8-15 kr/m² (privat), 5-12 kr/m² (erhverv), min 30, max 500, default 90
- "Antal badeværelser" — stk, 150-250 kr/stk, min 1, max 5, default 1
- "Antal toiletter ekstra" — stk, 80-150 kr/stk
- "Vinduer indvendigt" — stk, 25-50 kr/stk
- "Hvidevarer indvendig rens" — stk (ovn/køl), 200-400 kr/stk
Ved hovedrengøring/flytterengøring: højere priser pr. m² (15-30 kr/m²).`,

  "Vinduespudsning": `BRANCHE: Vinduespudsning.
Typiske trin:
- "Antal vinduesfag" — stk, 25-45 kr/stk
- "Karme & rammer" — stk, 10-20 kr/stk (tillæg)
- "Ovenlys / tagvinduer" — stk, 60-120 kr/stk
- "Etager (højde)" — stk, 50-150 kr/stk (tillæg pr. etage over stueplan)
Ved erhverv/glasfacader: brug m² (20-60 kr/m²).`,

  "Haveservice": `BRANCHE: Haveservice / anlægsgartner.
Typiske trin:
- "Græsplæne" — m², 3-8 kr/m² (klipning), 15-40 kr/m² (anlæg)
- "Hækklipning" — m (løbende meter), 40-80 kr/m
- "Beskæring af træer" — stk, 400-1500 kr/stk
- "Ukrudtsbekæmpelse" — m², 5-12 kr/m²
- "Bortkørsel af haveaffald" — m³, 250-500 kr/m³`,

  "Flyttehjælp": `BRANCHE: Flyttehjælp / transport.
Typiske trin:
- "Boligstørrelse" — m², 35-70 kr/m²
- "Antal etager (uden elevator)" — stk, 300-600 kr/stk (tillæg)
- "Afstand til ny adresse" — km, 8-15 kr/km
- "Klaver / tungt møbel" — stk, 800-2000 kr/stk
- "Pakkeservice" — timer, 350-500 kr/time`,

  "Maler": `BRANCHE: Malerarbejde.
Typiske trin:
- "Vægareal" — m², 80-160 kr/m² (2 strøg)
- "Loft" — m², 90-180 kr/m²
- "Døre/karme" — stk, 400-800 kr/stk
- "Vinduer indvendigt" — stk, 350-700 kr/stk
- "Spartling/forarbejde" — m², 40-90 kr/m²`,

  "Håndværker": `BRANCHE: Tømrer/snedker/håndværker.
Typiske trin:
- "Timer" — timer, 450-650 kr/time (grundgebyr trin 1)
- "Materialer estimat" — kr, 1 kr/kr (lader kunden indtaste estimat)
- "Antal dage" — stk, 3500-5500 kr/stk
- "Kørsel" — km, 6-12 kr/km`,

  "VVS": `BRANCHE: VVS.
Typiske trin:
- "Udkald (grundgebyr)" — stk, 600-900 kr/stk (min=max=default=1)
- "Timer" — timer, 600-850 kr/time
- "Antal armaturer" — stk, 800-1800 kr/stk
- "Kørsel" — km, 8-14 kr/km`,

  "Elektriker": `BRANCHE: Elektriker.
Typiske trin:
- "Udkald (grundgebyr)" — stk, 550-850 kr/stk (min=max=default=1)
- "Timer" — timer, 550-800 kr/time
- "Antal stikkontakter" — stk, 350-650 kr/stk
- "Lampeudtag" — stk, 400-700 kr/stk`,

  "Sikkerhed": `BRANCHE: Sikkerhed/låsesmed/alarm.
Typiske trin:
- "Udkald (grundgebyr)" — stk, 700-1200 kr/stk (min=max=default=1)
- "Timer" — timer, 600-900 kr/time
- "Antal låse" — stk, 800-2500 kr/stk
- "Antal kameraer" — stk, 1500-4000 kr/stk`,
};

function guidelinesFor(category?: string, subcategory?: string): string {
  if (!category) return "";
  const base = CATEGORY_GUIDELINES[category];
  if (!base) return "";
  const subHint = subcategory
    ? `\n\nUNDERKATEGORI: ${subcategory} — tilpas trin og priser specifikt til denne underkategori (fx "Flytterengøring" har højere pris/m² end almindelig rengøring; "Erhverv" bruger m² fremfor antal-baserede trin).`
    : "";
  return base + subHint;
}

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

    const categoryGuidelines = guidelinesFor(serviceCategory, subcategory);

    const systemPrompt = `Du opsætter en prisberegner for en service på en dansk marketplace.
Du returnerer 2-5 trin der gør det muligt for kunden at sammensætte en realistisk pris for netop denne service.

Regler for trin:
- Hvert trin skal være SPECIFIKT for denne service og kategori — aldrig generisk fyld.
- Brug realistiske 2025-priser i DKK pr. enhed (ekskl. moms).
- Vælg den enhed der passer bedst fra denne liste: ${ALLOWED_UNITS.join(", ")}.
- min_value <= default_value <= max_value (alle skal være tal, ikke null).
- Korte, klare danske labels (max 40 tegn). Fx "Antal vinduer", "Boligstørrelse", "Antal rum".
- Hvis servicen typisk har et "udkald/grundgebyr" — gør FØRSTE trin til det med min=max=default=1 og prisen som grundgebyr.
- Tilpas til virksomhedens branche, by (storby = højere priser) og beskrivelse hvis tilgængeligt.
- 2-3 trin er ofte bedst. Brug kun flere trin hvis det giver kunden reel valgfrihed.
- Undgå dobbelt-trin (fx både "antal vinduer" og "antal vinduesfag").

${categoryGuidelines ? `KATEGORI-RETNINGSLINJER (følg disse priser og enheder tæt):\n${categoryGuidelines}` : "Bruger ukendt kategori — brug sund fornuft og typisk dansk markedspris."}`;

    const userPrompt = `Lav en prisberegner-opsætning til denne service.

Virksomhed: ${businessLine || "(ingen oplysninger)"}
Service: ${serviceLine}

Returnér 2-5 trin der præcist matcher denne service og kategori. Følg kategori-retningslinjerne i system-prompten for enheder og prisleje.`;

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