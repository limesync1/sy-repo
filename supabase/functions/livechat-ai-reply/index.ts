// Edge function — Serviceyderes AI-første kundeservice i den offentlige livechat.
//
// Kaldes anonymt (uden login) fra LiveChatWidget efter hver besked fra en
// besøgende. Funktionen:
//  1. Slår samtalen op via session_token (samme mønster som de øvrige
//     token-baserede RPC'er) med service-role, så vi kan indsætte beskeder
//     som "admin" (AI-assistenten) uden at gå gennem RLS.
//  2. Stopper automatisk hvis en rigtig medarbejder allerede har svaret,
//     eller hvis samtalen er eskaleret til et menneske — så AI'en aldrig
//     overskriver en menneskelig medarbejder.
//  3. Genererer et kort, præcist svar på dansk via Lovable AI Gateway med
//     kontekst om Serviceydere (se src/lib/brand.ts og public/llms.txt).
//  4. Eskalerer proaktivt (indsætter en system-besked + sender notifikation)
//     hvis modellen selv vurderer at en medarbejder bør tage over, eller
//     hvis den besøgende selv beder om det.
//
// Et separat action="escalate" kald bruges når den besøgende trykker
// "Tal med et menneske" i widget'en — her genereres intet AI-svar.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_SENDER_NAME = "Serviceydere AI";
const ESCALATE_MARKER = "[ESKALER_TIL_MENNESKE]";

// Sætninger der tydeligt betyder "jeg vil have en rigtig person" — bruges
// som ekstra sikkerhedsnet ud over modellens egen vurdering.
const HUMAN_REQUEST_PATTERNS = [
  "tale med et menneske", "tale med en person", "snakke med et menneske",
  "snakke med en person", "en rigtig person", "et rigtigt menneske",
  "medarbejder", "kundeservicemedarbejder", "menneskelig hjælp",
  "ikke en robot", "ikke en bot", "supportmedarbejder",
];

const PLANNER_GUIDE_URL = "https://serviceydere.dk/guides/serviceydere-ruteplanlaegger-brugerguide.pdf";

const KNOWLEDGE = `OM SERVICEYDERE:
Serviceydere er en dansk platform, der kombinerer et driftssystem til servicevirksomheder med kørende medarbejdere (ruteplanlægning, medarbejder-app, booking og fakturering) med en markedsplads der sender nye kunder til de samme virksomheder. Brancheuafhængigt — dækker rengøring, vinduespudsning, haveservice, håndværk, flytning, skadedyr, industriservice m.fl.

FOR KUNDER (privat/erhverv der søger en udbyder):
- Find og sammenlign lokale virksomheder på /virksomheder, filtrér på kategori og by.
- Beskriv en opgave på /tilbud og få op til 3 gratis tilbud fra relevante udbydere.
- Book direkte fra en virksomheds profilside, se priser, anmeldelser og åbningstider.
- Det er gratis for kunder at bruge platformen og få tilbud.

FOR VIRKSOMHEDER (udbydere der vil bruge softwaren og/eller stå på markedspladsen):
- Priser: 289 kr./md. ekskl. moms inkl. ruteplanlægning, 59 kr./md. pr. medarbejderlogin, 269 kr./md. for regnskabsintegration (e-conomic eller Dinero), 2.269 kr. i opstart og 1.495 kr. for dataimport (support udfører selve importen af eksisterende kunder).
- 14 dages gratis prøve uden betalingskort, ingen binding.
- Ruteplanlægger: drag & drop, faste/gentagne aftaler, beregnet kørselstid og ETA, konfliktadvarsler, kort- og tidslinjevisning, "optimér rækkefølge", print/PDF.
- Medarbejder-app: dagens rute, tjek ind/ud, noter og billeder.
- Booking og fakturering: online booking, prisberegner, leads fra markedspladsen, fakturering med e-conomic/Dinero.
- Guide til ruteplanlæggeren (PDF): ${PLANNER_GUIDE_URL}. Henvis hertil ved spørgsmål om "hvordan gør jeg" i ruteplanlæggeren.

VIGTIGT — DU MÅ IKKE:
- Opfinde priser, funktioner eller vilkår der ikke står ovenfor.
- Love konkrete leveringstider, garantier, refusion eller juridiske afgørelser.
- Give råd om en specifik igangværende bestilling/faktura/klage — det skal en medarbejder tage sig af.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "");
    const action = body?.action === "escalate" ? "escalate" : "reply";
    if (token.length < 32) {
      return new Response(JSON.stringify({ error: "Ugyldig sessions-token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: conv } = await admin
      .from("chat_conversations")
      .select("id, visitor_name, visitor_email, subject, status")
      .eq("session_token", token)
      .maybeSingle();
    if (!conv) {
      return new Response(JSON.stringify({ error: "Samtalen findes ikke" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: msgs } = await admin
      .from("chat_messages")
      .select("id, sender_type, sender_name, content, is_system, metadata, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(60);
    const history = msgs || [];

    const alreadyEscalated = history.some((m: any) => m.is_system && m.metadata?.kind === "escalation");
    const humanTookOver = history.some(
      (m: any) => m.sender_type === "admin" && !m.is_system && m.metadata?.kind !== "ai",
    );

    const notifyEscalation = async (reason: string) => {
      admin.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "new-chat-message",
            recipientEmail: "kontakt@serviceydere.dk",
            idempotencyKey: `chat-escalate-${conv.id}`,
            templateData: {
              conversationToken: token,
              visitorName: conv.visitor_name,
              visitorEmail: conv.visitor_email,
              subject: conv.subject || "",
              message: `🙋 ${reason}`,
              isLoggedIn: false,
            },
          },
        })
        .catch(() => {});
    };

    const insertSystemEscalation = async (reason: string) => {
      const { data: row } = await admin
        .from("chat_messages")
        .insert({
          conversation_id: conv.id,
          sender_type: "admin",
          sender_name: "Serviceydere",
          content: "En medarbejder er koblet på og svarer dig hurtigst muligt.",
          is_system: true,
          metadata: { kind: "escalation" },
        })
        .select("id, sender_type, sender_name, content, is_system, metadata, created_at")
        .single();
      await notifyEscalation(reason);
      return row;
    };

    // ------- Eksplicit "Tal med et menneske"-tryk fra widget'en -------
    if (action === "escalate") {
      if (alreadyEscalated) {
        return new Response(JSON.stringify({ escalated: true, skipped: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const row = await insertSystemEscalation("Kunden bad selv om at tale med en medarbejder.");
      return new Response(JSON.stringify({ escalated: true, message: row }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------- Automatisk AI-svar -------
    if (conv.status === "closed" || alreadyEscalated || humanTookOver) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastVisitorMsg = [...history].reverse().find((m: any) => m.sender_type === "visitor" && !m.is_system);
    const lastVisitorText = (lastVisitorMsg?.content || "").toLowerCase();
    const explicitHumanRequest = HUMAN_REQUEST_PATTERNS.some((p) => lastVisitorText.includes(p));

    if (explicitHumanRequest) {
      const row = await insertSystemEscalation("Kunden skrev at de gerne vil tale med en medarbejder.");
      return new Response(JSON.stringify({ escalated: true, message: row }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ingen ny besked fra den besøgende at svare på (fx kun system-beskeder endnu).
    if (!lastVisitorMsg) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Undgå at svare to gange på samme besked (fx dobbelt-klik/race).
    const lastAiMsg = [...history].reverse().find((m: any) => m.metadata?.kind === "ai");
    if (lastAiMsg && new Date(lastAiMsg.created_at) > new Date(lastVisitorMsg.created_at)) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI gateway ikke konfigureret" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = (conv.visitor_name || "").split(" ")[0] || "";
    const transcript = history
      .filter((m: any) => !m.is_system && m.content)
      .slice(-16)
      .map((m: any) => `${m.sender_type === "admin" ? "Support" : (firstName || "Kunde")}: ${m.content}`)
      .join("\n");

    const systemPrompt = `Du er "Serviceydere AI" — en dygtig, venlig og præcis kundeservice-assistent for platformen Serviceydere.dk, som svarer automatisk i livechatten. Du svarer altid på dansk, kort og konkret (maks. 4-5 sætninger), i "du"-form, uden emojis og uden at indlede med "Her er et svar" el.lign. Brug KUN viden fra afsnittet nedenfor — find aldrig funktioner, priser eller vilkår på.

Hvis du er i tvivl, ikke kan svare præcist ud fra viden nedenfor, eller kunden virker frustreret/utilfreds, spørger om en konkret bestilling/faktura/klage/refusion, eller selv beder om at tale med et menneske — så afslut dit svar med teksten "${ESCALATE_MARKER}" på sin egen linje (ingen andre tegn på den linje). Brug kun markøren når det reelt er relevant, ikke som standard.

${KNOWLEDGE}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Emne: ${conv.subject || "(ingen)"}\n\nSamtale:\n${transcript}` },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "For mange forespørgsler lige nu — prøv igen om lidt." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      // AI-kredit opbrugt — eskalér i stedet for at fejle stille, så kunden altid får hjælp.
      const row = await insertSystemEscalation("AI-assistenten er midlertidigt utilgængelig.");
      return new Response(JSON.stringify({ escalated: true, message: row }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI-fejl: ${text.slice(0, 200)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    let reply: string = aiJson?.choices?.[0]?.message?.content?.trim() || "";
    const shouldEscalate = reply.includes(ESCALATE_MARKER);
    if (shouldEscalate) reply = reply.replace(ESCALATE_MARKER, "").trim();
    if (!reply) reply = "Jeg er ikke helt sikker på svaret her — jeg kobler en medarbejder på til dig.";

    const { data: aiRow } = await admin
      .from("chat_messages")
      .insert({
        conversation_id: conv.id,
        sender_type: "admin",
        sender_name: AI_SENDER_NAME,
        content: reply,
        is_system: false,
        metadata: { kind: "ai" },
      })
      .select("id, sender_type, sender_name, content, image_url, is_system, metadata, created_at")
      .single();

    let escalationRow = null;
    if (shouldEscalate) {
      escalationRow = await insertSystemEscalation("AI-assistenten vurderede at en medarbejder bør tage over.");
    }

    return new Response(JSON.stringify({ message: aiRow, escalated: shouldEscalate, escalationMessage: escalationRow }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
