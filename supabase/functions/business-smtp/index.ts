// Ejerens opsætning af egen mailkonto (SMTP): hent status, gem+test, send test, slå til/fra, fjern.
// Adgangskoden returneres aldrig. Testmails går kun til virksomhedens egen afsenderadresse.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { requireAuthenticatedUser } from "../_shared/auth.ts";
import {
  SMTP_ALLOWED_PORTS, createSmtpTransport, encryptSmtpPassword, friendlySmtpError, sendViaBusinessSmtp, type SmtpRow,
} from "../_shared/smtp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("get"), businessId: z.string().uuid() }),
  z.object({
    action: z.literal("save"), businessId: z.string().uuid(),
    host: z.string().trim().min(3).max(200).regex(/^[a-z0-9.-]+$/i),
    port: z.number().int().refine((p) => (SMTP_ALLOWED_PORTS as readonly number[]).includes(p)),
    username: z.string().trim().min(1).max(200),
    password: z.string().max(500).optional(),
    fromEmail: z.string().trim().email().max(200),
    fromName: z.string().trim().max(80).optional(),
  }),
  z.object({ action: z.literal("test"), businessId: z.string().uuid() }),
  z.object({ action: z.literal("toggle"), businessId: z.string().uuid(), enabled: z.boolean() }),
  z.object({ action: z.literal("delete"), businessId: z.string().uuid() }),
]);

const publicView = (r: any) => r ? ({
  configured: true, enabled: r.enabled, host: r.host, port: r.port, username: r.username,
  fromEmail: r.from_email, fromName: r.from_name, verifiedAt: r.verified_at,
  lastError: r.last_error, lastErrorAt: r.last_error_at, lastSentAt: r.last_sent_at,
}) : { configured: false };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireAuthenticatedUser(req, SUPABASE_URL, ANON);
    if (auth.status !== 200) return json({ ok: false, error: "Log ind igen" }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ ok: false, error: "Tjek felterne – port skal være 465 eller 2525" }, 400);
    const body = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: biz } = await admin.from("businesses").select("id, name, owner_id").eq("id", body.businessId).maybeSingle();
    if (!biz || biz.owner_id !== auth.userId) return json({ ok: false, error: "Ingen adgang" }, 403);
    const table = admin.from("business_smtp_settings");
    const load = async () => (await admin.from("business_smtp_settings").select("*").eq("business_id", biz.id).maybeSingle()).data as any;

    if (body.action === "get") return json({ ok: true, settings: publicView(await load()) });

    if (body.action === "delete") {
      await table.delete().eq("business_id", biz.id);
      return json({ ok: true, settings: { configured: false } });
    }

    if (body.action === "toggle") {
      const row = await load();
      if (!row) return json({ ok: false, error: "Opsæt mailkontoen først" }, 400);
      if (body.enabled && !row.verified_at) return json({ ok: false, error: "Forbindelsen skal virke, før den kan slås til" }, 400);
      await table.update({ enabled: body.enabled, updated_at: new Date().toISOString() }).eq("business_id", biz.id);
      return json({ ok: true, settings: publicView(await load()) });
    }

    if (body.action === "save") {
      const existing = await load();
      let cipher = existing?.password_ciphertext, iv = existing?.password_iv;
      let password = body.password ?? "";
      if (password) { const enc = await encryptSmtpPassword(password); cipher = enc.ciphertext; iv = enc.iv; }
      else if (existing) {
        const { decryptSmtpPassword } = await import("../_shared/smtp.ts");
        password = await decryptSmtpPassword(existing.password_ciphertext, existing.password_iv);
      } else return json({ ok: false, error: "Skriv adgangskoden" }, 400);

      // Tjek forbindelse + login, før noget slås til.
      const t = createSmtpTransport({ host: body.host, port: body.port, username: body.username, password });
      let verifyError: string | null = null;
      try { await t.verify(); } catch (e) { verifyError = friendlySmtpError(e); } finally { t.close(); }

      const now = new Date().toISOString();
      const row = {
        business_id: biz.id, host: body.host.toLowerCase(), port: body.port, username: body.username,
        from_email: body.fromEmail.toLowerCase(), from_name: body.fromName || null,
        password_ciphertext: cipher, password_iv: iv,
        verified_at: verifyError ? null : now,
        enabled: verifyError ? false : true,
        last_error: verifyError, last_error_at: verifyError ? now : null, updated_at: now,
      };
      const { error } = await table.upsert(row, { onConflict: "business_id" });
      if (error) throw error;
      return json({ ok: !verifyError, error: verifyError, settings: publicView(await load()) });
    }

    // test: send en rigtig mail til virksomhedens egen afsenderadresse
    const row = await load() as SmtpRow | null;
    if (!row) return json({ ok: false, error: "Opsæt mailkontoen først" }, 400);
    try {
      await sendViaBusinessSmtp(row, {
        to: row.from_email, fallbackName: biz.name ?? "Serviceydere",
        subject: "Test fra Serviceydere – jeres mail virker",
        text: `Hej!\n\nDenne test er sendt fra jeres egen mailkonto via Serviceydere.\nFremover sendes påmindelser og kvitteringer til jeres kunder herfra.\n\nMvh. Serviceydere.dk`,
        html: `<p>Hej!</p><p>Denne test er sendt fra jeres egen mailkonto via Serviceydere.</p><p>Fremover sendes påmindelser og kvitteringer til jeres kunder herfra.</p><p>Mvh. Serviceydere.dk</p>`,
      });
      await table.update({ last_error: null, last_error_at: null, last_sent_at: new Date().toISOString() }).eq("business_id", biz.id);
      return json({ ok: true, sentTo: row.from_email, settings: publicView(await load()) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await table.update({ last_error: msg, last_error_at: new Date().toISOString() }).eq("business_id", biz.id);
      return json({ ok: false, error: msg, settings: publicView(await load()) });
    }
  } catch (e) {
    console.error("business-smtp:", e);
    return json({ ok: false, error: "Noget gik galt. Prøv igen om lidt." }, 500);
  }
});
