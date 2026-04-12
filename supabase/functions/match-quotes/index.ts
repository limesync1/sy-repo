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

    // Fetch businesses in this category with their services and reviews
    const { data: businesses, error: bizError } = await supabase
      .from("businesses")
      .select("*, services(*), reviews(*)")
      .eq("is_active", true)
      .eq("category", category);

    if (bizError) throw bizError;

    // Also fetch businesses without category (or all if few results)
    let allBusinesses = businesses || [];
    if (allBusinesses.length < 3) {
      const { data: moreBiz } = await supabase
        .from("businesses")
        .select("*, services(*), reviews(*)")
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

    // Build context for AI
    const bizSummaries = allBusinesses.map((b: any) => {
      const avgRating = b.reviews?.length > 0
        ? (b.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / b.reviews.length).toFixed(1)
        : "Ingen";
      const serviceList = (b.services || []).map((s: any) => 
        `${s.name} (${s.pricing_type === "fast_pris" ? `${s.base_price} kr` : s.pricing_type === "timepris" ? `${s.base_price} kr/t` : "prisberegner"})${s.subcategory ? ` [${s.subcategory}]` : ""}`
      ).join(", ");
      return `ID: ${b.id} | Navn: ${b.name} | By: ${b.city || "Ukendt"} | Rating: ${avgRating} (${b.reviews?.length || 0} anmeldelser) | Verificeret: ${b.is_verified ? "Ja" : "Nej"} | Services: ${serviceList || "Ingen"} | Beskrivelse: ${b.description || ""}`;
    }).join("\n");

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
            content: `Du er en ekspert-matcher for serviceydere i Danmark. Du modtager en kundes behov og en liste af virksomheder. 
            
Vælg de 3 bedste matches. For hver match skal du give:
- business_id (ID fra listen)
- match_score (1-100)
- reason (2-3 sætninger på dansk om HVORFOR denne virksomhed passer til kundens behov)
- estimated_price (et estimeret prisinterval i kr baseret på services, fx "800-1.200 kr")

Prioriter: relevante services/underkategorier, gode anmeldelser, verificerede virksomheder, og geografisk nærhed.
Hvis der er færre end 3 gode matches, returner kun dem der passer.`,
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
              description: "Return the matched businesses",
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
                      },
                      required: ["business_id", "match_score", "reason", "estimated_price"],
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
    const matchedIds = parsed.matches.map((m: any) => m.business_id);

    // Enrich with full business data
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
            base_price: s.base_price,
            pricing_type: s.pricing_type,
            subcategory: s.subcategory,
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
