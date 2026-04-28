/**
 * verify-custom-domain
 * --------------------
 * Tjekker om en virksomheds custom domæne er korrekt opsat:
 *  1) TXT-record på `_serviceydere.<domain>` indeholder `serviceydere-verify=<token>`
 *     For subdomæner accepteres også `_serviceydere.<root-domain>` fordi mange
 *     DNS-udbydere automatisk tilføjer zonen, når brugeren skriver `_serviceydere`.
 *     (token = de første 16 tegn af business.id) — bekræfter ejerskab.
 *  2) CNAME (eller A) for selve hostnavnet peger på serviceydere.dk / cname.serviceydere.app.
 *
 * Vi bruger Google's DNS-over-HTTPS (gratis, ingen auth) så funktionen virker
 * direkte fra Edge runtime uden ekstra secrets.
 *
 * Resultatet gemmes i businesses.settings.custom_domain_status så UI kan
 * vise rigtig status uden at skulle kalde API'et igen ved hvert load.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APEX_TARGET = "serviceydere.dk";
// Tilladte CNAME-mål (lower-case, uden trailing dot). Vi accepterer både
// hovedplatformens domæne og lovable.app som forwarder.
const ALLOWED_TARGETS = [
  "serviceydere.dk.",
  "serviceydere.lovable.app.",
];

const cleanDomain = (raw: string): string =>
  raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0];

const expectedToken = (businessId: string): string =>
  businessId.replace(/-/g, "").slice(0, 16);

const txtHostCandidates = (domain: string): string[] => {
  const labels = domain.split(".").filter(Boolean);
  const hosts = [`_serviceydere.${domain}`];
  if (labels.length > 2) hosts.push(`_serviceydere.${labels.slice(1).join(".")}`);
  return Array.from(new Set(hosts));
};

async function dnsLookup(name: string, type: "TXT" | "CNAME" | "A"): Promise<string[]> {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { Accept: "application/dns-json" },
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (!data.Answer || !Array.isArray(data.Answer)) return [];
    return data.Answer
      .filter((a: any) => (type === "TXT" ? a.type === 16 : type === "CNAME" ? a.type === 5 : a.type === 1))
      .map((a: any) => String(a.data || "").toLowerCase().replace(/^"|"$/g, ""));
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Ikke logget ind" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Bekræft kalderen
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Ugyldig session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const businessId = String(body.business_id || "");
    const rawDomain = String(body.domain || "");
    if (!businessId || !rawDomain) {
      return new Response(JSON.stringify({ error: "Mangler business_id eller domain" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificer ejerskab af business
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id, owner_id, settings")
      .eq("id", businessId)
      .single();
    if (bizErr || !biz) {
      return new Response(JSON.stringify({ error: "Virksomhed ikke fundet" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (biz.owner_id !== userId) {
      // Tjek om bruger er admin
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!roles) {
        return new Response(JSON.stringify({ error: "Ingen adgang til denne virksomhed" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const domain = cleanDomain(rawDomain);
    // Simpel format-check (samme logik som klient-side, men igen for sikkerhed)
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) {
      return new Response(JSON.stringify({
        ok: false,
        status: "invalid",
        message: "Domænet ser ikke gyldigt ud. Brug fx 'mitfirma.dk' uden https:// eller stier.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = expectedToken(businessId);
    const txtNames = txtHostCandidates(domain);

    // 1) TXT ownership
    const txtResults = await Promise.all(txtNames.map(async (host) => ({ host, records: await dnsLookup(host, "TXT") })));
    const txtRecords = txtResults.flatMap((result) => result.records);
    const ownershipOk = txtRecords.some((r) => r.includes(`serviceydere-verify=${token}`));

    // 2) CNAME / A peger på vores platform
    const cnames = await dnsLookup(domain, "CNAME");
    const aRecords = await dnsLookup(domain, "A");
    let pointingOk = cnames.some((c) => ALLOWED_TARGETS.includes(c));
    // Hvis ingen CNAME, accepter A-record der opløser til samme IP som apex.
    if (!pointingOk && aRecords.length > 0) {
      const apexIps = await dnsLookup(APEX_TARGET, "A");
      pointingOk = apexIps.length > 0 && aRecords.some((ip) => apexIps.includes(ip));
    }

    // DNS-status. Vigtigt: Selvom DNS er korrekt opsat, skal en admin
    // stadig manuelt registrere domænet på hosting-platformen (Lovable)
    // før det kan svare på trafik med SSL. Derfor "pending_activation".
    // Når admin har aktiveret domænet sættes status til "active".
    const existingSettings = (biz.settings as any) || {};
    const wasActive = existingSettings.custom_domain_status === "active"
      && existingSettings.custom_domain === domain;

    const status: "active" | "pending_activation" | "pending_ownership" | "pending_dns" | "failed" =
      wasActive && ownershipOk && pointingOk ? "active"
        : ownershipOk && pointingOk ? "pending_activation"
        : !ownershipOk ? "pending_ownership"
        : "pending_dns";

    const message =
      status === "active" ? "Domænet er aktivt og live."
      : status === "pending_activation" ? "DNS er korrekt opsat. Vi har modtaget din anmodning og aktiverer domænet hurtigst muligt (typisk inden for 1 hverdag)."
      : status === "pending_ownership" ? `Vi kunne ikke finde en TXT-record på ${txtNames.join(" eller ")} med værdien serviceydere-verify=${token}. Tilføj den hos din DNS-udbyder.`
      : "Ejerskabet er bekræftet, men domænet peger ikke på serviceydere.dk endnu. Tjek dine CNAME/A-records.";

    // Gem status i settings (auto-merge)
    const settings = existingSettings;
    settings.custom_domain = domain;
    settings.custom_domain_status = status;
    settings.custom_domain_dns_verified_at = (ownershipOk && pointingOk)
      ? (settings.custom_domain_dns_verified_at || new Date().toISOString())
      : null;
    settings.custom_domain_verified_at = status === "active"
      ? (settings.custom_domain_verified_at || new Date().toISOString())
      : null;
    settings.custom_domain_last_checked_at = new Date().toISOString();

    await supabase.from("businesses").update({ settings }).eq("id", businessId);

    return new Response(JSON.stringify({
      ok: true,
      status,
      message,
      verification: {
        host: txtNames[0],
        accepted_hosts: txtNames,
        type: "TXT",
        value: `serviceydere-verify=${token}`,
      },
      pointing: {
        host: domain,
        type: "CNAME",
        value: APEX_TARGET,
      },
      checks: {
        ownership_ok: ownershipOk,
        pointing_ok: pointingOk,
        txt_records_found: txtRecords,
        txt_hosts_checked: txtResults,
        cname_records_found: cnames,
        a_records_found: aRecords,
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
