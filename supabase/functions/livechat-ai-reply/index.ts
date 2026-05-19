// Edge function: livechat-ai-reply
// Serviceydere support-AI. Kan svare, eskalere, eller anbefale en konkret
// virksomhed (med kort) baseret på besøgendes behov og lokation.
import { createClient } from "npm:@supabase/supabase-js@2";
import { lookupDkZip, haversineKm } from "../match-quotes/dk-postcodes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `Du er "Serviceydere AI" — en præcis, kort og kundefokuseret assistent på Serviceydere.dk.

FAKTA OM SERVICEYDERE.DK (brug KUN dette):
- Dansk marketplace hvor kunder finder, sammenligner og booker lokale udbydere af services som rengøring, vinduespudsning, flyttehjælp, haveservice, håndværker, maler, VVS, elektriker, tømrer m.m.
- Kunden kan søge på forsiden eller /virksomheder, eller bruge /tilbud for at få op til 3 matchede tilbud.
- Serviceydere er ikke part i aftalen mellem kunde og udbyder.
- Jeg kender ikke konkrete priser, opstartstid, dækning på adresse, abonnement, binding eller bestemte aftaler — det hentes en rigtig medarbejder ind til.

REGLER:
- Svar ALTID på dansk, kort (maks. 2 sætninger).
- Hvis kunden leder efter en serviceyder ("jeg skal bruge en til...", "kender I nogen i...", "find en X i Y", "kan I anbefale...", "behov for rengøring/vinduespudsning/..."), så brug action "recommend".
- Brug action "escalate" ved: krav om menneske/telefon, klage, refusion, login/konto, abonnementspris, binding, juridisk, opstartstid, dækning på konkret adresse, fejl på siden, eller hvis du er det mindste i tvivl.
- Ellers brug action "reply" til generel info.
- Lov aldrig noget på vegne af en udbyder.

OUTPUT: returnér ALTID GYLDIG JSON i præcis dette format:
{"action":"reply"|"escalate"|"recommend","message":string,"recommend":{"business_id":string,"category":string,"why":string}|null}

- "message" er det den besøgende ser. Hold den kort, varm og 2. person ("du/dig").
- Når action="recommend": vælg KUN én "business_id" fra CANDIDATES nedenfor som bedst matcher kundens behov OG ligger tættest på kundens lokation. "why" er en MEGET kort begrundelse (max 180 tegn, 1 sætning) skrevet direkte til kunden i 2. person — fx "De ligger 2 km fra dig i Aarhus og tilbyder netop vinduespudsning." Vælg ALDRIG en business_id der ikke findes i CANDIDATES. Hvis ingen passer, brug action="reply" og sig pænt at du ikke kunne finde en passende udbyder lige nu og foreslå /tilbud.
- "message" når action="recommend" bør være kort intro som: "Jeg har fundet en udbyder der passer godt til dig — se kortet herunder." Kort og venlig.
- Når action="escalate": kort dansk besked om at du henter en rigtig medarbejder. Lov ingen svartid.`;

const tryParseJson = (text: string): { action: string; message: string; recommend?: any } | null => {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    if (typeof parsed?.message !== "string" || typeof parsed?.action !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
};

const HUMAN_INTENT = /\b(menneske|rigtig person|medarbejder|person|ring|ringe|telefon|opkald|supporter|kundeservice|ikke en bot|ikke robot|snakke med nogen|tale med nogen)\b/i;
const HIGH_RISK = /\b(klage|klager|refundering|refusion|tilbagebetaling|faktura|juridisk|advokat|fejl på siden|login|konto|abonnement|binding|adresse|dækker i|hvornår kan|opstart|garanti|utilfreds|frustreret)\b/i;

const shouldForceEscalate = (text: string) => HUMAN_INTENT.test(text) || HIGH_RISK.test(text);

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Rengøring": ["rengør", "rengjør", "støvsug", "hovedrengør", "vinduesvask"],
  "Vinduespudsning": ["vindue", "vinduespuds", "rentvand"],
  "Haveservice": ["have", "hæk", "græs", "klipning", "plæne"],
  "Flyttehjælp": ["flytte", "flytning", "flyttehjælp", "flyttemand"],
  "Tømrer": ["tømrer", "snedker", "terrasse"],
  "Maler": ["maler", "male", "maling"],
  "VVS": ["vvs", "blikkenslager", "afløb", "rør", "vandhane"],
  "Elektriker": ["elektriker", "el-installation", "stikkontakt", "lampe"],
  "Algebehandling": ["alge", "tagrens"],
  "Skadedyrsbekæmpelse": ["rotter", "mus", "skadedyr"],
  "Anlægsgartner": ["anlægsgartner", "fliser", "indkørsel"],
  "Gulvlægger": ["gulv", "laminat", "parket"],
  "Skorstensfejer": ["skorsten", "brændeovn"],
  "Sikkerhed": ["alarm", "kamera", "overvågning"],
  "Murer": ["murer", "murværk"],
};

const guessCategories = (text: string): string[] => {
  const t = text.toLowerCase();
  const hits: string[] = [];
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) hits.push(cat);
  }
  return hits;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { conversation_id, visitor_location } = body as {
      conversation_id?: string;
      visitor_location?: { city?: string | null; zip?: string | null };
    };
    if (!conversation_id || typeof conversation_id !== "string") {
      return new Response(JSON.stringify({ error: "missing conversation_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: conv } = await admin
      .from("chat_conversations")
      .select("id, status, business_id, needs_human, visitor_name")
      .eq("id", conversation_id)
      .maybeSingle();

    if (!conv) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
    }
    if (conv.business_id || conv.status === "closed" || conv.needs_human) {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: msgs } = await admin
      .from("chat_messages")
      .select("sender_type, sender_name, content, is_system, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(40);

    const history = (msgs ?? [])
      .filter((m) => !m.is_system && (m.content?.trim().length ?? 0) > 0)
      .map((m) => ({
        role: m.sender_type === "visitor" ? "user" : "assistant",
        content: m.content ?? "",
      }));

    const last = (msgs ?? []).filter((m) => !m.is_system).at(-1);
    if (!last || last.sender_type !== "visitor") {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const lastText = last.content ?? "";
    if (shouldForceEscalate(lastText)) {
      await admin.from("chat_conversations").update({ needs_human: true }).eq("id", conversation_id);
      await admin.from("chat_messages").insert({
        conversation_id,
        sender_type: "admin",
        sender_name: "Serviceydere AI",
        content: "Jeg henter en rigtig medarbejder fra Serviceydere, så du får et sikkert svar. De vender tilbage her i chatten.",
      });
      await admin.from("chat_messages").insert({
        conversation_id,
        sender_type: "admin",
        sender_name: "System",
        content: "🙋 Besøgende skal have hjælp fra en rigtig medarbejder.",
        is_system: true,
      });
      return new Response(JSON.stringify({ ok: true, escalated: true, forced: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Hent kandidat-virksomheder nær brugeren, så AI'en kan anbefale én ──
    const userZip = visitor_location?.zip || null;
    const userCity = visitor_location?.city || null;
    const userPoint = lookupDkZip(userZip);

    const recentTexts = (msgs ?? [])
      .filter((m) => !m.is_system && m.sender_type === "visitor")
      .slice(-3)
      .map((m) => m.content || "")
      .join(" ");
    const guessedCats = guessCategories(recentTexts || lastText);

    // Forsøg først at hente virksomheder der matcher en gættet kategori.
    let candidates: any[] = [];
    if (guessedCats.length > 0) {
      const { data } = await admin
        .from("businesses")
        .select("id, name, slug, description, city, zip_code, logo_url, cover_image_url, categories, is_verified, services(id, name, description, pricing_type, base_price, unit, subcategory, is_active)")
        .eq("is_active", true)
        .overlaps("categories", guessedCats)
        .limit(20);
      candidates = data || [];
    }
    // Fallback: bredere udvalg
    if (candidates.length < 4) {
      const { data } = await admin
        .from("businesses")
        .select("id, name, slug, description, city, zip_code, logo_url, cover_image_url, categories, is_verified, services(id, name, description, pricing_type, base_price, unit, subcategory, is_active)")
        .eq("is_active", true)
        .limit(20);
      const existing = new Set(candidates.map((b) => b.id));
      candidates = [...candidates, ...((data || []).filter((b) => !existing.has(b.id)))];
    }

    // Sortér efter afstand (når vi har bruger-zip), ellers behold rækkefølgen.
    if (userPoint) {
      candidates = candidates
        .map((b) => {
          const p = lookupDkZip(b.zip_code);
          const d = p ? haversineKm(userPoint, p) : null;
          return { ...b, _distanceKm: d };
        })
        .sort((a, b) => (a._distanceKm ?? 9999) - (b._distanceKm ?? 9999));
    }
    candidates = candidates.slice(0, 8);

    const candidateSummary = candidates.length
      ? candidates.map((b) => {
          const cats = (b.categories || []).join(", ");
          const services = (b.services || []).filter((s: any) => s.is_active).slice(0, 6)
            .map((s: any) => `${s.name}${s.subcategory ? ` (${s.subcategory})` : ""}`).join(", ");
          const dist = typeof b._distanceKm === "number"
            ? ` — ${b._distanceKm < 1 ? "<1" : Math.round(b._distanceKm)} km fra kunden`
            : "";
          return `ID:${b.id} | ${b.name}${b.is_verified ? " ✓" : ""} | By: ${b.city || "?"}${dist} | Brancher: ${cats || "—"} | Services: ${services || "—"}`;
        }).join("\n")
      : "(ingen kandidater fundet)";

    const locationContext = userZip || userCity
      ? `Kundens lokation: ${userZip || ""} ${userCity || ""}`.trim()
      : "Kundens lokation: ukendt (brug ikke afstand)";

    const userPrompt = `${locationContext}

KANDIDATER (vælg KUN business_id herfra ved action="recommend"):
${candidateSummary}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: userPrompt },
          ...history,
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      await admin.from("chat_conversations").update({ needs_human: true }).eq("id", conversation_id);
      await admin.from("chat_messages").insert({
        conversation_id,
        sender_type: "admin",
        sender_name: "System",
        content: "⚠️ AI kunne ikke svare sikkert. En medarbejder skal overtage samtalen.",
        is_system: true,
      });
      return new Response(JSON.stringify({ ok: true, escalated: true, reason: "ai_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? "";
    const parsed = tryParseJson(raw) ?? {
      action: "escalate",
      message: "Jeg er ikke helt sikker på svaret, så jeg henter en rigtig medarbejder fra Serviceydere. De vender tilbage her i chatten.",
    };

    if (parsed.action === "escalate") {
      await admin.from("chat_conversations").update({ needs_human: true }).eq("id", conversation_id);
      await admin.from("chat_messages").insert({
        conversation_id,
        sender_type: "admin",
        sender_name: "Serviceydere AI",
        content: parsed.message,
      });
      await admin.from("chat_messages").insert({
        conversation_id,
        sender_type: "admin",
        sender_name: "System",
        content: "🙋 Besøgende har bedt om at tale med en rigtig medarbejder.",
        is_system: true,
      });
      return new Response(JSON.stringify({ ok: true, escalated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.action === "recommend" && parsed.recommend?.business_id) {
      const biz = candidates.find((b) => b.id === parsed.recommend.business_id);
      if (biz) {
        // 1) AI-besked til kunden
        await admin.from("chat_messages").insert({
          conversation_id,
          sender_type: "admin",
          sender_name: "Serviceydere AI",
          content: parsed.message || "Jeg har fundet en udbyder der passer godt til dig — se kortet herunder.",
        });
        // 2) Kortet — gemmes som besked med metadata
        const services = (biz.services || [])
          .filter((s: any) => s.is_active)
          .slice(0, 4)
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            pricing_type: s.pricing_type,
            base_price: s.base_price,
            unit: s.unit,
            subcategory: s.subcategory,
          }));
        const metadata = {
          kind: "business_recommendation",
          why: String(parsed.recommend.why || "").slice(0, 280),
          category: parsed.recommend.category || null,
          distance_km: typeof biz._distanceKm === "number" ? Math.round(biz._distanceKm * 10) / 10 : null,
          business: {
            id: biz.id,
            name: biz.name,
            slug: biz.slug,
            description: biz.description,
            city: biz.city,
            logo_url: biz.logo_url,
            cover_image_url: biz.cover_image_url,
            categories: biz.categories || [],
            is_verified: !!biz.is_verified,
          },
          services,
        };
        await admin.from("chat_messages").insert({
          conversation_id,
          sender_type: "admin",
          sender_name: "Serviceydere AI",
          content: null,
          metadata,
        });
        return new Response(JSON.stringify({ ok: true, recommended: biz.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Faldt igennem — behandl som almindeligt reply
    }

    await admin.from("chat_messages").insert({
      conversation_id,
      sender_type: "admin",
      sender_name: "Serviceydere AI",
      content: parsed.message,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("livechat-ai-reply error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
