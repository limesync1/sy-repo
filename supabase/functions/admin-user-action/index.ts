// admin-user-action — supportende admin-handlinger på en bruger.
// Aktioner: password_reset, magic_link. Kun admins (has_role) må kalde
// dette. Logges via _admin_log (Postgres-funktionen) ind i admin_audit_log.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: meRes } = await userClient.auth.getUser(token);
    const me = meRes?.user;
    if (!me) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: me.id, _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const userId = String(body?.user_id || "");
    if (!userId || !["password_reset", "magic_link"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: target, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !target?.user?.email) {
      return new Response(JSON.stringify({ error: "User not found or no email" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = target.user.email;

    const type = action === "password_reset" ? "recovery" : "magiclink";
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: type as any, email,
    });
    if (linkErr) throw linkErr;

    // Log handling (best-effort) — kald som brugeren så auth.uid() = admin
    try {
      await userClient.rpc("_admin_log", {
        p_action: action,
        p_target_type: "user",
        p_target_id: userId,
        p_target_label: email,
        p_details: {},
      } as any);
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ ok: true, sent_to: email, action_link: link?.properties?.action_link ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});