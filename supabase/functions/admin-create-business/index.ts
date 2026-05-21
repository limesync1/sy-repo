// admin-create-business — opretter en virksomhed manuelt fra platform-admin.
// Hvis ejer-e-mail ikke findes oprettes en ny bruger med engangskodeord.
// Opretter business + business_plans-række med valgt prøveperiode og
// sender velkomstmail med login.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "virksomhed";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Verificér admin-rolle på kalderen
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller } } = await admin.auth.getUser(token);
  if (!caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: roleRow } = await admin
    .from("user_roles").select("role")
    .eq("user_id", caller.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const name = String(body.name || "").trim();
  const ownerEmail = String(body.ownerEmail || "").trim().toLowerCase();
  const category = body.category ? String(body.category).trim() : null;
  const city = body.city ? String(body.city).trim() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const trialDays = Math.max(0, Math.min(365, Number(body.trialDays ?? 14)));
  const sendWelcome = body.sendWelcome !== false;

  if (!name || name.length < 2) {
    return new Response(JSON.stringify({ error: "Navn mangler" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return new Response(JSON.stringify({ error: "Ugyldig ejer-e-mail" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1) Find eller opret ejer-bruger
  let ownerId: string | null = null;
  let createdPassword: string | null = null;
  let userExisted = false;

  try {
    for (let page = 1; page <= 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const found = data?.users?.find((u) => u.email?.toLowerCase() === ownerEmail);
      if (found) { ownerId = found.id; userExisted = true; break; }
      if (!data?.users || data.users.length < 200) break;
    }
  } catch (_e) {}

  if (!ownerId) {
    createdPassword = generatePassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: createdPassword,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Kunne ikke oprette bruger" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    ownerId = created.user.id;
  }

  // 2) Generér unik slug
  let slug = slugify(name);
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data: existing } = await admin
      .from("businesses").select("id").eq("slug", candidate).maybeSingle();
    if (!existing) { slug = candidate; break; }
  }

  // 3) Opret virksomhed
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .insert({
      owner_id: ownerId, name, slug, category, city, phone,
      email: ownerEmail, is_active: true, is_verified: false,
    })
    .select("id, slug, name")
    .single();
  if (bizErr || !biz) {
    return new Response(JSON.stringify({ error: bizErr?.message || "Kunne ikke oprette virksomhed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4) Opret plan-række med prøveperiode
  const trialEnd = trialDays > 0 ? new Date(Date.now() + trialDays * 86400000).toISOString() : null;
  await admin.from("business_plans").insert({
    business_id: biz.id,
    status: trialDays > 0 ? "trialing" : "active",
    trial_ends_at: trialEnd,
  });

  // 5) Audit-log
  await admin.from("admin_audit_log").insert({
    admin_id: caller.id,
    admin_email: caller.email,
    action: "create_business",
    target_type: "business",
    target_id: biz.id,
    target_label: biz.name,
    details: { owner_email: ownerEmail, user_existed: userExisted, trial_days: trialDays },
  });

  // 6) Velkomstmail (fire-and-forget)
  if (sendWelcome) {
    const origin = req.headers.get("origin") || "https://serviceydere.dk";
    admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "business-welcome",
        recipientEmail: ownerEmail,
        idempotencyKey: `business-welcome-${biz.id}`,
        templateData: {
          businessName: biz.name,
          loginUrl: `${origin}/log-ind`,
          email: ownerEmail,
          password: createdPassword || undefined,
          trialDays,
        },
      },
    }).catch(() => {});
  }

  return new Response(JSON.stringify({
    businessId: biz.id, slug: biz.slug, ownerId, userExisted,
    temporaryPassword: createdPassword,
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});