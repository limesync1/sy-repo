import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { lookupDkZip, haversineKm } from "./dk-postcodes.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      category,
      description,
      location,
      radius_km,
      customer,        // { name, email, phone, share_contact? }
      terms_accepted,  // boolean — customer must accept platform terms
      persist = true,  // when false, only returns matches without saving (e.g. previews)
    } = await req.json();
    if (!category || !description) {
      return new Response(JSON.stringify({ error: "category and description required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Require explicit consent — required by GDPR/markedsføringsloven before
    // we may share customer data with matched businesses.
    if (persist && !terms_accepted) {
      return new Response(JSON.stringify({ error: "Du skal acceptere vilkår og privatlivspolitik for at modtage tilbud." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userCity: string | null = location?.city || null;
    const userZip: string | null = location?.zip || null;
    const customerName: string = (customer?.name || "Anonym kunde").toString().slice(0, 200);
    const customerEmail: string | null = customer?.email ? String(customer.email).toLowerCase().trim() : null;
    const customerPhone: string | null = customer?.phone ? String(customer.phone).trim() : null;
    const shareContact: boolean = customer?.share_contact !== false;
    // null/undefined => "Hele DK" (no radius filter). Otherwise km.
    const radiusKm: number | null =
      typeof radius_km === "number" && radius_km > 0 ? radius_km : null;
    const userPoint = lookupDkZip(userZip);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query by categories array (contains) instead of single category field
    const { data: businesses, error: bizError } = await supabase
      .from("businesses")
      .select("*, services(*, calculator_steps(*)), reviews(*)")
      .eq("is_active", true)
      .contains("categories", [category]);

    if (bizError) throw bizError;

    let allBusinesses = businesses || [];

    // Fallback: also try old single-category field for backwards compat
    if (allBusinesses.length < 3) {
      const { data: legacyBiz } = await supabase
        .from("businesses")
        .select("*, services(*, calculator_steps(*)), reviews(*)")
        .eq("is_active", true)
        .eq("category", category);
      if (legacyBiz) {
        const existingIds = new Set(allBusinesses.map((b: any) => b.id));
        allBusinesses = [...allBusinesses, ...legacyBiz.filter((b: any) => !existingIds.has(b.id))];
      }
    }

    // If still not enough, grab more businesses
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

    // ── Annotate with distance + apply radius filter ──
    // Respect opt-in: only businesses that have enabled the Leads feature
    // (Indstillinger → Avanceret → "Leads fra Indhent 3 tilbud") should be
    // matched. This keeps the feature truly opt-in for providers.
    allBusinesses = allBusinesses.filter(
      (b: any) => (b?.settings as any)?.leads_enabled === true,
    );

    if (userPoint) {
      allBusinesses = allBusinesses.map((b: any) => {
        const bizPoint = lookupDkZip(b.zip_code);
        const distanceKm = bizPoint ? haversineKm(userPoint, bizPoint) : null;
        return { ...b, _distanceKm: distanceKm };
      });

      if (radiusKm !== null) {
        const within = allBusinesses.filter(
          (b: any) => typeof b._distanceKm === "number" && b._distanceKm <= radiusKm,
        );
        // Don't return zero results if everyone is outside the radius — better to
        // give the AI the closest few so it can still suggest something. We'll
        // sort by distance and trim.
        if (within.length >= 2) {
          allBusinesses = within;
        } else {
          allBusinesses = [...allBusinesses]
            .sort((a: any, b: any) => {
              const da = typeof a._distanceKm === "number" ? a._distanceKm : Infinity;
              const db = typeof b._distanceKm === "number" ? b._distanceKm : Infinity;
              return da - db;
            })
            .slice(0, 5);
        }
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
      const cats = Array.isArray(b.categories) && b.categories.length > 0
        ? b.categories.join(", ")
        : b.category || "Ingen";
      const distanceLabel = typeof b._distanceKm === "number"
        ? ` | Afstand: ${b._distanceKm < 1 ? "<1" : Math.round(b._distanceKm)} km fra kunden`
        : "";
      const serviceList = (b.services || []).map((s: any) => {
        let sDesc = `Service[id=${s.id}]: ${s.name} (${s.pricing_type === "fast_pris" ? `${s.base_price} kr` : s.pricing_type === "timepris" ? `${s.base_price} kr/t` : "prisberegner"})`;
        if (s.subcategory) sDesc += ` [${s.subcategory}]`;
        if (s.interval_options && s.interval_options.length > 0) {
          sDesc += ` [intervaller: ${s.interval_options.join(", ")}]`;
        }
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
      return `ID: ${b.id} | Navn: ${b.name} | By: ${b.city || "Ukendt"} | Brancher: ${cats} | Rating: ${avgRating} (${b.reviews?.length || 0} anmeldelser) | Verificeret: ${b.is_verified ? "Ja" : "Nej"}${distanceLabel}\nServices:\n${serviceList || "Ingen"}\nBeskrivelse: ${b.description || ""}`;
    }).join("\n---\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const locationContext = userCity || userZip
      ? `Kundens lokation: ${userZip || ""} ${userCity || ""}${radiusKm !== null ? ` (kun udbydere inden for ${radiusKm} km vises herunder — afstand er angivet pr. udbyder)` : " (ingen radius — hele Danmark)"}. Foretræk udbydere t\u00e6t p\u00e5, men kvalitet og services m\u00e5 stadig veje tungt.`
      : "";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Du er en ekspert-matcher for serviceydere i Danmark. Du modtager en kundes behov og en liste af virksomheder med deres services og prisberegnertrin.

Din opgave:
1. Vælg de 3 bedste matches (eller færre hvis der ikke er nok relevante)
2. For HVER match, udpeg de relevante services og UDFYLD prisberegner-trin baseret på kundens beskrivelse

For hver match returner:
- business_id
- match_score (1-100)
- reason (1-2 korte sætninger, max 240 tegn, dansk, skrevet direkte til kunden i 2. person ("du/dig/din"). Omtal virksomheden ved navn i 3. person ("de/deres"). Nævn konkret hvorfor matchet er relevant for kunden — fx afstand fra dig, by, branche, services der passer. Ingen klichéer, ingen "vi", ingen markedsføringssprog. Eksempel: "NavnetHer ligger under 1 km fra dig i Haderup og tilbyder vinduespudsning. Deres prisberegner dækker primært hovedrengøring, men de har lokal erfaring med opgaven.")
- estimated_price (prisinterval baseret på beregnede priser)
- service_prefills: array af { service_id, hours (kun for timepris), step_values: array af { step_id, value } }

VIGTIGT: Læs kundens beskrivelse nøje og udtræk mængder/antal. Fx "15 m2 støvsugning" → sæt step med enhed m2 til 15. "3 skraldespande" → sæt relevant step til 3.
Kun inkluder services der er relevante for kundens behov. Udfyld KUN trin der matcher kundens beskrivelse.`,
          },
          {
            role: "user",
            content: `Kundens behov:
Kategori: ${category}
${locationContext}
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
        distance_km: typeof biz._distanceKm === "number" ? biz._distanceKm : null,
        business: {
          id: biz.id,
          name: biz.name,
          slug: biz.slug,
          description: biz.description,
          city: biz.city,
          categories: biz.categories || (biz.category ? [biz.category] : []),
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
            interval_options: s.interval_options || ["engangskøb"],
            service_category: s.service_category,
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

    // ── Persist quote_request + matches and dispatch lead emails ──
    let quoteRequestId: string | null = null;
    if (persist && enrichedMatches.length > 0 && customerEmail) {
      try {
        const { data: qr, error: qrErr } = await supabase
          .from("quote_requests")
          .insert({
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            category,
            description,
            city: userCity,
            zip_code: userZip,
            radius_km: radiusKm,
            share_contact: shareContact,
            status: "open",
            terms_accepted_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (qrErr) {
          console.error("quote_request insert error:", qrErr);
        } else {
          quoteRequestId = qr.id;

          const matchRows = enrichedMatches.map((m: any) => ({
            quote_request_id: qr.id,
            business_id: m.business.id,
            match_score: Math.max(0, Math.min(100, Math.round(Number(m.match_score) || 0))),
            reason: m.reason || null,
            estimated_price: m.estimated_price || null,
            service_prefills: m.service_prefills || [],
            distance_km: typeof m.distance_km === "number" ? m.distance_km : null,
            status: "new",
            notified_at: new Date().toISOString(),
          }));

          // Use upsert with the unique (quote_request_id, business_id) index
          // as conflict target so we never create duplicate leads even if the
          // function is retried or invoked twice in parallel.
          const { data: insertedMatches, error: matchErr } = await supabase
            .from("quote_request_matches")
            .upsert(matchRows, { onConflict: "quote_request_id,business_id", ignoreDuplicates: true })
            .select("business_id");
          if (matchErr) console.error("quote_request_matches upsert error:", matchErr);
          const newlyInserted = new Set((insertedMatches || []).map((r: any) => r.business_id));

          // Fire-and-forget email per matched business owner
          // We need owner email — fetch businesses with their notification settings + owner profile
          const bizIds = enrichedMatches.map((m: any) => m.business.id);
          const { data: bizDetails } = await supabase
            .from("businesses")
            .select("id, name, email, owner_id, notification_settings")
            .in("id", bizIds);

          // Optional: pull profile display_name for greeting
          const ownerIds = (bizDetails || []).map((b: any) => b.owner_id).filter(Boolean);
          const { data: profiles } = ownerIds.length
            ? await supabase.from("profiles").select("user_id, display_name").in("user_id", ownerIds)
            : { data: [] as any[] };
          const profileByOwner = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));

          // Run in parallel, ignore errors so the response isn't blocked
          await Promise.allSettled(enrichedMatches.map(async (m: any) => {
            // Only send mails for newly inserted matches — never re-mail on retries
            if (!newlyInserted.has(m.business.id)) return;
            const biz = (bizDetails || []).find((b: any) => b.id === m.business.id);
            const recipient = biz?.email || null;
            if (!recipient) return;
            // Respect business notification opt-out: settings.notification_settings.lead_emails === false
            const notif = (biz?.notification_settings as any) || {};
            if (notif.lead_emails === false) return;

            await sendTemplateEmail("new-lead", recipient, {
              idempotencyKey: `new-lead-${qr.id}-${biz.id}`,
              templateData: {
                  businessName: biz.name,
                  ownerName: profileByOwner.get(biz.owner_id) || null,
                  customerName,
                  customerCity: userCity,
                  customerZip: userZip,
                  category,
                  description,
                  matchScore: Math.round(Number(m.match_score) || 0),
                  reason: m.reason || null,
                  estimatedPrice: m.estimated_price || null,
                  distanceKm: typeof m.distance_km === "number" ? m.distance_km : null,
                  shareContact,
                  customerEmail: shareContact ? customerEmail : null,
                  customerPhone: shareContact ? customerPhone : null,
                  leadsUrl: "https://serviceydere.dk/virksomhed?tab=leads",
              },
            }).catch((e) => console.error("send lead email failed:", biz.id, e));
          }));
        }
      } catch (persistErr) {
        console.error("persist/notify error:", persistErr);
      }
    }

    return new Response(JSON.stringify({ matches: enrichedMatches, quote_request_id: quoteRequestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-quotes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
