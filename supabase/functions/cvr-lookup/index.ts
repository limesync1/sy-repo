// Slå dansk virksomhed op via CVR-nummer (cvrapi.dk - gratis, kræver User-Agent)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cvr } = await req.json();
    const cleaned = String(cvr || "").replace(/\D/g, "");
    if (cleaned.length !== 8) {
      return new Response(JSON.stringify({ error: "CVR skal være 8 cifre" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://cvrapi.dk/api?search=${cleaned}&country=dk`;
    let resp: Response;
    try {
      resp = await fetch(url, {
        headers: { "User-Agent": "Serviceydere/1.0 (kontakt@serviceydere.dk)" },
      });
    } catch {
      return new Response(JSON.stringify({ found: false, reason: "service_down" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // cvrapi.dk returnerer 404 når CVR-nummeret ikke findes — det er IKKE
    // en fejl, blot et "not found".  Andre status-koder behandles som
    // midlertidig utilgængelighed (vis venlig besked i stedet for fejl-toast).
    if (resp.status === 404) {
      return new Response(JSON.stringify({ found: false, reason: "not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      return new Response(JSON.stringify({ found: false, reason: "service_down" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let data: any = null;
    try { data = await resp.json(); } catch { /* invalid JSON */ }
    if (!data || data.error || !data.name) {
      return new Response(JSON.stringify({ found: false, reason: "not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      found: true,
      cvr: cleaned,
      name: data.name,
      address: data.address || null,
      zip_code: data.zipcode ? String(data.zipcode) : null,
      city: data.city || null,
      phone: data.phone ? String(data.phone) : null,
      email: data.email || null,
      industry: data.industrydesc || null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});