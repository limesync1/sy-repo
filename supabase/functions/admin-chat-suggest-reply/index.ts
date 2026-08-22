// Edge function — foreslår et svar til admin i livechat.
//
// Vi sender de seneste 12 beskeder fra samtalen til Lovable AI Gateway og
// får ét konkret svar-udkast tilbage på dansk. Admin kan så indsætte det i
// chat-input og redigere før afsendelse. Funktionen er bevidst minimal —
// den ændrer ikke databasen og logger ikke for hvert kald (det ville
// fylde audit-log unødigt).

import { createClient } from "npm:@supabase/supabase-js@2";
import { FULL_KNOWLEDGE, PLANNER_GUIDE_URL } from "../_shared/serviceydere-knowledge.ts";
import { sanitizeLinks } from "../_shared/valid-links.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bekræft admin-rolle
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const conversationId = String(body?.conversation_id || "");
    if (!conversationId) {
      return new Response(JSON.stringify({ error: "conversation_id påkrævet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hent samtalemetadata + sidste 12 beskeder
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: conv } = await admin
      .from("chat_conversations").select("visitor_name, subject")
      .eq("id", conversationId).maybeSingle();
    const { data: msgs } = await admin
      .from("chat_messages")
      .select("sender_type, sender_name, content, is_system, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(12);

    const ordered = (msgs || []).reverse();
    const transcript = ordered
      .filter((m: any) => !m.is_system && m.content)
      .map((m: any) => `${m.sender_type === "admin" ? "Support" : (m.sender_name || "Kunde")}: ${m.content}`)
      .join("\n");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI gateway ikke konfigureret" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = (conv?.visitor_name || "kunden").split(" ")[0];
    const systemPrompt = `Du er en venlig dansk kundeservice-medarbejder for platformen Serviceydere (markedsplads for håndværkere og serviceudbydere). Skriv ét konkret svar-udkast på dansk til "${firstName}" baseret på samtalehistorikken. Maks 4 sætninger. Brug "du", ikke "De". Ingen emojis. Ingen indledning som "Her er et svar:" — bare selve svaret. Hvis kunden spørger om noget der kræver opfølgning, foreslå konkret næste skridt. Du kender platformens ruteplanlægger indgående — brug kun viden fra afsnittet nedenfor og find aldrig på funktioner. Når spørgsmålet handler om ruteplanlægning, kalender, ruter, medarbejderplanlægning eller "hvordan gør jeg", så henvis til den downloadbare brugerguide med det fulde link ${PLANNER_GUIDE_URL}.\n\n${FULL_KNOWLEDGE}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // Et kort svar-udkast i livechat — lite-modellen er rigeligt og billigere.
        model: "google/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Emne: ${conv?.subject || "(ingen)"}\n\nSamtale:\n${transcript || "(ingen beskeder endnu)"}` },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "For mange kald — prøv igen om lidt" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI-kredit opbrugt — tilføj kredit i Lovable AI" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI-fejl: ${text.slice(0, 200)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw: string = aiJson?.choices?.[0]?.message?.content?.trim() || "";
    const { text: suggestion, issues } = sanitizeLinks(raw);
    if (issues.length > 0) console.error("AI link issues (suggest)", JSON.stringify(issues));
    return new Response(JSON.stringify({ suggestion }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
