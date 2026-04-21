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
    const resp = await fetch(url, {
      headers: { "User-Agent": "Serviceydere/1.0 (kontakt@serviceydere.dk)" },
    });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "CVR-service utilgængelig" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    if (data.error || !data.name) {
      return new Response(JSON.stringify({ found: false }), {
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