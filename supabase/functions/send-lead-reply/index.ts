import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Metoden er ikke tilladt" });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Du er ikke logget ind" });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) return json(401, { error: "Du er ikke logget ind" });

    const body = await req.json().catch(() => ({}));
    const matchId = typeof body?.matchId === "string" ? body.matchId : "";
    const subject = String(body?.subject ?? "").trim().slice(0, 200);
    const text = String(body?.body ?? "").trim().slice(0, 10000);
    if (!/^[0-9a-f-]{36}$/i.test(matchId)) return json(400, { error: "Ugyldig forespørgsel" });
    if (!subject) return json(400, { error: "Skriv et emne" });
    if (text.length < 5) return json(400, { error: "Skriv en besked først" });

    // RLS sikrer, at kun virksomhedens egne leads kan læses
    const { data: match } = await supabase
      .from("quote_request_matches")
      .select("id, status, business_id, quote_request:quote_requests(customer_email)")
      .eq("id", matchId).maybeSingle();
    if (!match) return json(404, { error: "Leadet blev ikke fundet" });
    const to = (match as any).quote_request?.customer_email;
    if (!to) return json(400, { error: "Kunden har ingen e-mail" });

    const { data: biz } = await supabase.from("businesses").select("name, email").eq("id", match.business_id).maybeSingle();
    if (!biz) return json(404, { error: "Virksomheden blev ikke fundet" });

    const result = await sendTemplateEmail("customer-notification", String(to), {
      templateData: { subject, body: text, businessName: biz.name },
      replyTo: biz.email || undefined,
    });
    if (!result.sent) return json(400, { error: "Kunden har frabedt sig e-mails, så beskeden kunne ikke sendes" });

    const now = new Date().toISOString();
    await supabase.from("quote_request_matches").update({
      ai_draft: text,
      ai_draft_subject: subject,
      status: match.status === "won" ? "won" : "contacted",
      responded_at: now,
    }).eq("id", matchId);

    return json(200, { sent: true, to, sentAt: now });
  } catch (e) {
    console.error("send-lead-reply error:", e);
    return json(500, { error: "E-mailen kunne ikke sendes. Prøv igen om lidt." });
  }
});
