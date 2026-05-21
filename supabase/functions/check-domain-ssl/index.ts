// Edge function — slår SSL-cert op for et custom-domæne via crt.sh og
// returnerer udsteder + udløbsdato. Vi bruger crt.sh fordi vi ikke kan
// lave en rå TLS-handshake fra Supabase Edge Runtime og læse peer-cert
// på en pålidelig måde. crt.sh er gratis Certificate Transparency-log,
// ingen API-nøgle, og dækker alle nyere Let's Encrypt-certifikater
// (som Lovable bruger til kunde-domæner).
//
// Resultatet skrives tilbage på `businesses.settings.custom_domain_ssl`
// så frontend kan vise det uden ekstra kald.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CrtshEntry = {
  issuer_name: string;
  name_value: string;
  not_before: string;
  not_after: string;
  id: number;
};

const cleanIssuer = (raw: string): string => {
  // crt.sh giver issuer_name som DN, fx "C=US, O=Let's Encrypt, CN=R3"
  const o = raw.match(/O=([^,]+)/);
  const cn = raw.match(/CN=([^,]+)/);
  return [o?.[1], cn?.[1]].filter(Boolean).join(" · ") || raw.slice(0, 80);
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
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const businessId = String(body?.business_id || "");
    const domain = String(body?.domain || "").trim().toLowerCase();
    if (!businessId || !domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      return new Response(JSON.stringify({ error: "business_id og gyldigt domain påkrævet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json&exclude=expired`;
    const res = await fetch(url, { headers: { "User-Agent": "serviceydere-admin/1.0" } });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `crt.sh svarede ${res.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await res.json() as CrtshEntry[];

    // Find seneste cert hvor not_after er længst i fremtiden
    const valid = (json || [])
      .filter((e) => e?.not_after && new Date(e.not_after).getTime() > Date.now())
      .sort((a, b) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime());

    const checkedAt = new Date().toISOString();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: biz } = await admin
      .from("businesses").select("settings").eq("id", businessId).maybeSingle();
    const settings = (biz?.settings || {}) as Record<string, unknown>;

    let ssl: Record<string, unknown>;
    if (valid.length === 0) {
      ssl = { checked_at: checkedAt, status: "not_found" };
    } else {
      const best = valid[0];
      ssl = {
        checked_at: checkedAt,
        status: "ok",
        issuer: cleanIssuer(best.issuer_name),
        not_before: best.not_before,
        not_after: best.not_after,
        crtsh_id: best.id,
      };
    }

    await admin.from("businesses").update({
      settings: { ...settings, custom_domain_ssl: ssl },
    }).eq("id", businessId);

    return new Response(JSON.stringify({ ssl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
