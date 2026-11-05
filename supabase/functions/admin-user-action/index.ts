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
    const redirectTo = body?.redirect_to ? String(body.redirect_to) : undefined;
    if (!userId || !["password_reset", "magic_link", "impersonate", "delete_user", "suspend", "unsuspend"].includes(action)) {
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
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const log = async (details: Record<string, unknown> = {}) => {
      try {
        await userClient.rpc("_admin_log", {
          p_action: action, p_target_type: "user", p_target_id: userId,
          p_target_label: email, p_details: details,
        } as any);
      } catch (_) { /* ignore */ }
    };

    if (["delete_user", "suspend", "unsuspend"].includes(action)) {
      if (userId === me.id) return json({ error: "Du kan ikke ændre din egen konto her." }, 400);
      const { data: targetIsAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (targetIsAdmin) return json({ error: "Admin-konti kan ikke slettes eller spærres." }, 400);

      if (action === "suspend" || action === "unsuspend") {
        const { error } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: action === "suspend" ? "876000h" : "none",
        } as any);
        if (error) throw error;
        await log();
        return json({ ok: true });
      }

      // delete_user: kræver at brugeren ikke ejer en aktiv virksomhed
      const { data: owned } = await admin.from("businesses")
        .select("id, name, deleted_at").eq("owner_id", userId);
      const active = (owned ?? []).filter((b: any) => !b.deleted_at);
      if (active.length > 0) {
        return json({
          error: `Brugeren ejer stadig ${active.map((b: any) => b.name).join(", ")}. Slet eller overdrag virksomheden først.`,
        }, 409);
      }
      await log({ businesses_deleted_before: (owned ?? []).length });
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("user_id", userId);
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) return json({ error: `Kunne ikke slette: ${delErr.message}` }, 500);
      return json({ ok: true, deleted: email });
    }

    const type = action === "password_reset" ? "recovery" : "magiclink";
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: type as any,
      email,
      options: redirectTo ? { redirectTo } : undefined,
    } as any);
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

    return new Response(JSON.stringify({
      ok: true,
      sent_to: email,
      action_link: link?.properties?.action_link ?? null,
      // Impersonation må aldrig sende mail — admin åbner action_link selv i incognito.
      mode: action === "impersonate" ? "open_link" : "email",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});