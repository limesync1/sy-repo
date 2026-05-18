// Edge function: livechat-ai-reply
// Trigger an AI response for a Serviceydere-support livechat conversation
// (conversations where business_id IS NULL). Detects when the visitor asks
// to talk to a real person and flags the conversation as needs_human so the
// platform admin panel can react (sound + badge).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `Du er "Serviceydere AI" — en præcis, ærlig og meget kortfattet kundeservice-assistent for Serviceydere.dk.

FAKTA OM SERVICEYDERE.DK (brug KUN dette — opfind aldrig features, priser, svartider eller garantier):
- Serviceydere.dk er en dansk platform for serviceydere: kunder kan finde, sammenligne og booke lokale udbydere, og virksomheder kan drive deres serviceforretning fra et panel.
- Find services: kunden søger på forsiden eller /virksomheder, kan filtrere efter kategori og by, se udbyderprofiler, priser hvor udbyderen har lagt dem ind, anmeldelser og åbningstider, og derefter booke direkte fra udbyderens profilside.
- Få tilbud: på /tilbud vælger kunden lokation, kategori, beskriver opgaven og skriver kontaktoplysninger. AI matcher opgaven med op til 3 relevante udbydere. Det er gratis og uforpligtende for kunden.
- Serviceydere er ikke part i aftalen mellem kunde og udbyder. Pris, kvalitet, udførelse, opstartstid, garanti, ændring, afbestilling og betaling for den konkrete service afhænger af den enkelte udbyder.
- Kategorier omfatter bl.a. rengøring, vinduespudsning, flyttehjælp, haveservice, håndværker, maler, VVS, elektriker, tømrer og sikkerhed.
- Bliv udbyder: virksomheder kan oprette sig via "Bliv udbyder" og får adgang til profilside, services/priser, online booking, kunde-/ordreoverblik, leads fra "Indhent 3 tilbud", ruteplanlægger, fakturering, anmeldelser, livechat og medarbejder-app.
- Jeg kender ikke konkrete abonnementspriser, bindingsvilkår eller individuelle aftaler. Hvis nogen spørger om det, skal en medarbejder overtage.

REGLER:
- Svar ALTID på dansk, kort (maks. 2 sætninger), konkret og uden marketingfyld.
- Hvis svaret kræver viden uden for fakta ovenfor, eller du er bare lidt i tvivl, så sæt "escalate": true.
- Eskalér altid ved spørgsmål om: menneskelig support, telefon/opkald, konkrete udbyderpriser, opstartstid, dækning i specifik adresse, abonnementstal, binding, faktura, konto/login, betaling/refusion, klage, jura, partnerskabsaftaler eller fejl på siden.
- Lov aldrig noget på vegne af en konkret udbyder.
- Skriv aldrig "formular". Brug "tilbudssiden", "/tilbud" eller "tilbudsflowet".
- Foreslå kun næste skridt når det er helt sikkert relevant: /virksomheder for at finde udbydere, /tilbud for op til 3 tilbud, eller "Bliv udbyder" for virksomheder.

OUTPUT: Du skal ALTID returnere GYLDIG JSON i præcis dette format og intet andet:
{"escalate": boolean, "message": string}

Når "escalate" er true skal "message" være en kort, ærlig dansk besked om at du henter en rigtig medarbejder fra Serviceydere som hurtigst muligt vender tilbage. Lov aldrig en konkret svartid.`;

const tryParseJson = (text: string): { escalate: boolean; message: string } | null => {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    if (typeof parsed?.message !== "string") return null;
    return { escalate: !!parsed.escalate, message: parsed.message };
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { conversation_id } = await req.json();
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
    // Kun Serviceydere-support (business_id null), åbne samtaler, og kun hvis vi
    // ikke allerede har eskaleret.
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

    // Hvis seneste besked ikke kommer fra besøgende, så svar ikke.
    const last = (msgs ?? []).filter((m) => !m.is_system).at(-1);
    if (!last || last.sender_type !== "visitor") {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "ai_failed", status: aiRes.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? "";
    const parsed = tryParseJson(raw) ?? {
      escalate: false,
      message: "Tak for din besked — vi vender tilbage hurtigst muligt.",
    };

    if (parsed.escalate) {
      await admin
        .from("chat_conversations")
        .update({ needs_human: true })
        .eq("id", conversation_id);

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
    } else {
      await admin.from("chat_messages").insert({
        conversation_id,
        sender_type: "admin",
        sender_name: "Serviceydere AI",
        content: parsed.message,
      });
    }

    return new Response(JSON.stringify({ ok: true, escalated: parsed.escalate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("livechat-ai-reply error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});