import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_UNITS = ["stk", "m²", "m", "timer", "rum", "km", "kg", "kr"];

// Kategori-specifikke retningslinjer som AI'en bruger til at lave realistiske trin.
// Baseret på faktiske 2025 danske markedspriser (ekskl. moms) hentet fra
// brancheforeninger, prissammenlignings-sites og typiske udbydere.
const CATEGORY_GUIDELINES: Record<string, string> = {
  "Rengøring": `BRANCHE: Rengøring (2025 priser ekskl. moms).
UNDERKATEGORI-LOGIK:
- "Privat rengøring" / "Fast rengøring": 159-229 kr/time ELLER 8-14 kr/m². Brug m² for store boliger.
- "Hovedrengøring": 18-28 kr/m², varighed 4-8 timer. Min 80m², default 100m².
- "Flytterengøring": 22-35 kr/m² (krav om K-mærket niveau). Min 50m², default 80m².
- "Erhvervsrengøring": 6-12 kr/m² (volumen-rabat). Min 100m², default 250m².
- "Vinduespudsning": se egen kategori.
TYPISKE TRIN (vælg de mest relevante 2-4):
- "Boligstørrelse" — m², default 90, min 30, max 400
- "Antal badeværelser" — stk, 180-280 kr/stk, default 1, min 1, max 5
- "Ovnrens" — stk, 250-450 kr/stk, default 0, min 0, max 2
- "Køleskab indvendig rens" — stk, 200-350 kr/stk, default 0, min 0, max 2
- "Vinduer indvendigt" — stk, 25-45 kr/stk, default 0
UNDGÅ: trin der duplikerer m² (fx "antal rum" hvis "boligstørrelse" allerede findes).`,

  "Vinduespudsning": `BRANCHE: Vinduespudsning (2025 priser ekskl. moms).
UNDERKATEGORI-LOGIK:
- "Privat" / "Villa": brug "antal vinduesfag" (et fag = ét rektangel der åbner separat).
- "Erhverv" / "Butik" / "Glasfacade": brug m² glasareal.
- "Tagvinduer/Velux" kræver lift eller stige → markant højere pris/stk.
TYPISKE TRIN:
- "Antal vinduesfag" — stk, 28-48 kr/stk (privat), default 12, min 4, max 80
- "Karme & rammer" — stk, 12-22 kr/stk (tillæg), default 0
- "Tagvinduer / Velux" — stk, 70-140 kr/stk, default 0, min 0, max 15
- "Glasareal (erhverv)" — m², 22-55 kr/m², default 50, min 10, max 1000
- "Etager over stueplan" — stk, 60-180 kr/stk (rentvandsanlæg/lift), default 0, min 0, max 6
ABONNEMENT giver 15-25% rabat — brug LAVERE ende af spændet hvis service er fast/ugentlig/månedlig.`,

  "Haveservice": `BRANCHE: Haveservice / anlægsgartner (2025 priser ekskl. moms).
UNDERKATEGORI-LOGIK:
- "Græsslåning" (fast): 1,5-4 kr/m² pr. klipning ved abonnement, 4-8 kr/m² engangs.
- "Hækklipning": pr. løbende meter, prisen afhænger af højde.
- "Træfældning/beskæring": pr. stk, prisen afhænger af størrelse.
- "Anlæg" (fliser, terrasse): 600-1400 kr/m².
TYPISKE TRIN:
- "Græsplæne" — m², 2-5 kr/m² (abonnement) eller 5-9 kr/m² (engangs), default 200, min 30, max 3000
- "Hækklipning (løbende meter)" — m, 45-90 kr/m (under 2m højde), default 20, min 0, max 300
- "Beskæring af træer/buske" — stk, 350-1400 kr/stk, default 0, min 0, max 20
- "Ukrudtsbekæmpelse fliser" — m², 8-18 kr/m², default 0, min 0, max 200
- "Bortkørsel haveaffald" — m³, 280-550 kr/m³ (inkl. deponi-gebyr), default 0, min 0, max 10`,

  "Flyttehjælp": `BRANCHE: Flyttehjælp / transport (2025 priser ekskl. moms).
UNDERKATEGORI-LOGIK:
- "Privat flytning": pris pr. m² + tillæg.
- "Pianoflytning/specialgods": fast pris pr. genstand (1500-4500 kr).
- "Erhvervsflytning": time-baseret med flere mand.
TYPISKE TRIN:
- "Boligstørrelse" — m², 40-75 kr/m² (op til 80km), default 80, min 30, max 350
- "Etager uden elevator" — stk, 350-650 kr/stk tillæg, default 0, min 0, max 6
- "Afstand mellem adresser" — km, 9-16 kr/km (efter første 25 km), default 15, min 0, max 500
- "Klaver / pengeskab / akvarium" — stk, 1200-3500 kr/stk, default 0, min 0, max 3
- "Pakkeservice (kasser ned)" — timer, 380-520 kr/time pr. mand, default 0, min 0, max 10`,

  "Maler": `BRANCHE: Malerarbejde indvendigt (2025 priser ekskl. moms, inkl. maling).
- "Vægareal" — m², 95-180 kr/m² (2 strøg, normal væg), default 40, min 5, max 300
- "Loft" — m², 110-200 kr/m² (sværere end vægge), default 20, min 5, max 200
- "Døre m. karm" — stk, 450-850 kr/stk (begge sider), default 0, min 0, max 15
- "Vinduer indvendigt" — stk, 380-750 kr/stk, default 0, min 0, max 15
- "Spartling/grundbehandling" — m², 45-95 kr/m² (tillæg ved dårlig overflade), default 0
UNDGÅ at sætte default til 0 på det vigtigste trin (vægareal) — sæt det til en typisk værdi.`,

  "Håndværker": `BRANCHE: Tømrer/snedker (2025 priser ekskl. moms).
- FØRSTE TRIN bør være "Udkald" — stk, 450-650 kr/stk (min=max=default=1) hvis service kræver fremmøde.
- "Timer" — timer, 475-650 kr/time, default 4, min 1, max 40
- "Materialer (estimat)" — kr, 1 kr/kr, default 0, min 0, max 50000
- "Kørsel ud over 25 km" — km, 7-13 kr/km, default 0, min 0, max 200
- "Antal arbejdsdage" — stk, 3800-5800 kr/stk (1 mand inkl. kørsel), default 1, min 1, max 30`,

  "VVS": `BRANCHE: VVS / blikkenslager (2025 priser ekskl. moms).
- FØRSTE TRIN: "Udkald (grundgebyr)" — stk, 650-950 kr/stk (min=max=default=1).
- "Timer" — timer, 625-895 kr/time, default 2, min 1, max 16
- "Nyt blandingsbatteri" — stk, 850-1900 kr/stk (inkl. arbejde, ekskl. armatur), default 0, min 0, max 5
- "Toilet udskiftning" — stk, 2200-3800 kr/stk, default 0, min 0, max 3
- "Akut tillæg (uden for åbningstid)" — stk, 800-1600 kr/stk, default 0, min 0, max 1
- "Kørsel" — km, 9-15 kr/km, default 0, min 0, max 100`,

  "Elektriker": `BRANCHE: Elektriker (2025 priser ekskl. moms).
- FØRSTE TRIN: "Udkald (grundgebyr)" — stk, 575-850 kr/stk (min=max=default=1).
- "Timer" — timer, 565-795 kr/time, default 2, min 1, max 16
- "Nye stikkontakter" — stk, 380-680 kr/stk (inkl. materiale + montering), default 0, min 0, max 20
- "Lampeudtag/spots" — stk, 420-750 kr/stk, default 0, min 0, max 30
- "HFI/HPFI gruppe ny" — stk, 1400-2400 kr/stk, default 0, min 0, max 5
- "Kørsel" — km, 8-14 kr/km, default 0, min 0, max 100`,

  "Sikkerhed": `BRANCHE: Låsesmed / alarm / overvågning (2025 priser ekskl. moms).
- FØRSTE TRIN: "Udkald" — stk, 750-1250 kr/stk (akut udkald højere). min=max=default=1.
- "Timer" — timer, 625-895 kr/time, default 1, min 1, max 8
- "Lås udskiftet" — stk, 850-2400 kr/stk (afhænger af type), default 0, min 0, max 6
- "IP-overvågningskamera (inkl. installation)" — stk, 1800-4200 kr/stk, default 0, min 0, max 10
- "Akut tillæg (nat/weekend)" — stk, 600-1400 kr/stk, default 0, min 0, max 1`,

  "Skadedyr": `BRANCHE: Skadedyrsbekæmpelse (2025 priser ekskl. moms).
- FØRSTE TRIN: "Inspektion + grundgebyr" — stk, 700-1200 kr/stk (min=max=default=1).
- "Timer" — timer, 650-900 kr/time, default 1, min 1, max 8
- "Antal opfølgningsbesøg" — stk, 450-850 kr/stk, default 1, min 0, max 6
- "Areal" — m², 4-12 kr/m² (større områder = lavere pris), default 100, min 30, max 2000`,

  "Bilpleje": `BRANCHE: Bilpleje / autoklargøring (2025 priser ekskl. moms).
- "Udvendig vask + pleje" — stk, 250-450 kr/stk, default 1
- "Indvendig støvsugning + pleje" — stk, 350-650 kr/stk, default 0
- "Polering (lakforsegling)" — stk, 1400-3500 kr/stk, default 0, min 0, max 1
- "Læderpleje sæder" — stk, 600-1400 kr/stk, default 0
- "Motorvask" — stk, 350-700 kr/stk, default 0`,
};

// Geografiske prisjusteringer (multiplikator) — anvendes i prompten,
// så AI'en kan løfte/sænke priser i den realistiske ende af spændet.
function geoModifierHint(city?: string): string {
  if (!city) return "";
  const c = city.toLowerCase();
  if (/(københav|frederiksberg|gentofte|hellerup|charlottenlund|lyngby|gladsaxe)/i.test(c)) {
    return `\nGEOGRAFI: ${city} ligger i Hovedstaden — brug ØVRE ende af prisspændet (ca. +10-15% over landsgennemsnit).`;
  }
  if (/(aarhus|århus|odense|aalborg|esbjerg|kolding|vejle|horsens|randers|roskilde|herning)/i.test(c)) {
    return `\nGEOGRAFI: ${city} er en større dansk by — brug MIDTER til øvre ende af prisspændet (landsgennemsnit).`;
  }
  return `\nGEOGRAFI: ${city} er typisk mindre by/yderområde — brug NEDRE til midter ende af prisspændet (-5-10% under landsgennemsnit).`;
}

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