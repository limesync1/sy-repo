import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, description } = await req.json();
    if (!category || !description) {
      return new Response(JSON.stringify({ error: "category and description required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: businesses, error: bizError } = await supabase
      .from("businesses")
      .select("*, services(*, calculator_steps(*)), reviews(*)")
      .eq("is_active", true)
      .eq("category", category);

    if (bizError) throw bizError;

    let allBusinesses = businesses || [];
    if (allBusinesses.length < 3) {
      const { data: moreBiz } = await supabase
        .from("businesses")
        .select("*, services(*, calculator_steps(*)), reviews(*)")
        .eq("is_active", true)
        .limit(20);
      if (moreBiz) {
        const existingIds = new Set(allBusinesses.map((b: any) => b.id));
        allBusinesses = [...allBusinesses, ...moreBiz.filter((b: any) => !existingIds.has(b.id))];
      }
    }

    if (allBusinesses.length === 0) {
      return new Response(JSON.stringify({ matches: [], message: "Ingen virksomheder fundet i denne kategori endnu." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build detailed context including calculator step IDs
    const bizSummaries = allBusinesses.map((b: any) => {
      const avgRating = b.reviews?.length > 0
        ? (b.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / b.reviews.length).toFixed(1)
        : "Ingen";
      const serviceList = (b.services || []).map((s: any) => {
        let sDesc = `Service[id=${s.id}]: ${s.name} (${s.pricing_type === "fast_pris" ? `${s.base_price} kr` : s.pricing_type === "timepris" ? `${s.base_price} kr/t` : "prisberegner"})`;
        if (s.subcategory) sDesc += ` [${s.subcategory}]`;
        if (s.pricing_type === "prisberegner" && s.calculator_steps?.length > 0) {
          const steps = s.calculator_steps.map((cs: any) =>
            `  Step[id=${cs.id}]: "${cs.label}" (${cs.price_per_unit} kr/${cs.unit}, min=${cs.min_value}, max=${cs.max_value})`
          ).join("\n");
          sDesc += `\n${steps}`;
        }
        if (s.pricing_type === "timepris") {
          sDesc += ` (timepris: angiv antal timer)`;
        }
        return sDesc;
      }).join("\n");
      return `ID: ${b.id} | Navn: ${b.name} | By: ${b.city || "Ukendt"} | Rating: ${avgRating} (${b.reviews?.length || 0} anmeldelser) | Verificeret: ${b.is_verified ? "Ja" : "Nej"}\nServices:\n${serviceList || "Ingen"}\nBeskrivelse: ${b.description || ""}`;
    }).join("\n---\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Du er en ekspert-matcher for serviceydere i Danmark. Du modtager en kundes behov og en liste af virksomheder med deres services og prisberegnertrin.

Din opgave:
1. Vælg de 3 bedste matches
2. For HVER match, udpeg de relevante services og UDFYLD prisberegner-trin baseret på kundens beskrivelse

For hver match returner:
- business_id
- match_score (1-100)
- reason (2-3 sætninger dansk)
- estimated_price (prisinterval baseret på beregnede priser)
- service_prefills: array af { service_id, hours (kun for timepris), step_values: array af { step_id, value } }

VIGTIGT: Læs kundens beskrivelse nøje og udtræk mængder/antal. Fx "15 m2 støvsugning" → sæt step med enhed m2 til 15. "3 skraldespande" → sæt relevant step til 3.
Kun inkluder services der er relevante for kundens behov. Udfyld KUN trin der matcher kundens beskrivelse.`,
          },
          {
            role: "user",
            content: `Kundens behov:
Kategori: ${category}
Beskrivelse: ${description}

Tilgængelige virksomheder:
${bizSummaries}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_matches",
              description: "Return the matched businesses with pre-filled service values",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        business_id: { type: "string" },
                        match_score: { type: "number" },
                        reason: { type: "string" },
                        estimated_price: { type: "string" },
                        service_prefills: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              service_id: { type: "string" },
                              hours: { type: "number", description: "For timepris services, the recommended hours" },
                              step_values: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    step_id: { type: "string" },
                                    value: { type: "number" },
                                  },
                                  required: ["step_id", "value"],
                                  additionalProperties: false,
                                },
                              },
                            },
                            required: ["service_id"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["business_id", "match_score", "reason", "estimated_price", "service_prefills"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_matches" } },
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
      throw new Error("AI matching fejlede");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned from AI");

    const parsed = JSON.parse(toolCall.function.arguments);

    const enrichedMatches = parsed.matches.map((m: any) => {
      const biz = allBusinesses.find((b: any) => b.id === m.business_id);
      if (!biz) return null;
      const avgRating = biz.reviews?.length > 0
        ? (biz.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / biz.reviews.length).toFixed(1)
        : null;
      return {
        ...m,
        business: {
          id: biz.id,
          name: biz.name,
          slug: biz.slug,
          description: biz.description,
          city: biz.city,
          is_verified: biz.is_verified,
          logo_url: biz.logo_url,
          cover_image_url: biz.cover_image_url,
          avg_rating: avgRating ? parseFloat(avgRating) : null,
          review_count: biz.reviews?.length || 0,
          services: (biz.services || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            base_price: s.base_price,
            pricing_type: s.pricing_type,
            subcategory: s.subcategory,
            image_url: s.image_url,
            unit: s.unit,
            is_active: s.is_active,
            calculator_steps: (s.calculator_steps || []).map((cs: any) => ({
              id: cs.id,
              label: cs.label,
              unit: cs.unit,
              price_per_unit: cs.price_per_unit,
              min_value: cs.min_value,
              max_value: cs.max_value,
              default_value: cs.default_value,
              sort_order: cs.sort_order,
            })),
          })),
        },
      };
    }).filter(Boolean);

    return new Response(JSON.stringify({ matches: enrichedMatches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-quotes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
