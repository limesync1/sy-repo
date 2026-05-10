// Geocode danske adresser via Nominatim (OpenStreetMap) — gratis og uden nøgle
// Bruges til at sætte lat/lng på orders så de kan vises på kort

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const address = String(body.address || "").trim();
    const zip = String(body.zip_code || "").trim();
    const city = String(body.city || "").trim();

    if (!address && !zip && !city) {
      return new Response(JSON.stringify({ error: "address, zip_code or city required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = [address, zip, city, "Danmark"].filter(Boolean).join(", ");
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=dk&q=${encodeURIComponent(query)}`;

    let resp: Response;
    try {
      resp = await fetch(url, {
        headers: { "User-Agent": "Serviceydere/1.0 (kontakt@serviceydere.dk)" },
      });
    } catch (e) {
      console.error("Geocoding fetch failed:", e);
      return new Response(JSON.stringify({ found: false, fallback: true, error: "GEOCODING_UNREACHABLE" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Geocoding service error:", resp.status, text);
      return new Response(JSON.stringify({ found: false, fallback: true, error: "GEOCODING_SERVICE_ERROR", upstream_status: resp.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let data: unknown;
    try {
      data = await resp.json();
    } catch {
      return new Response(JSON.stringify({ found: false, fallback: true, error: "GEOCODING_INVALID_RESPONSE" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(data) || data.length === 0) {
      return new Response(JSON.stringify({ found: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hit = (data as any[])[0];
    // Build a clean Danish-format display name: "Vej Nr, 1234 By"
    // Nominatim returns address parts when addressdetails=1 — but to keep this lightweight
    // we parse from the input + display fallback.
    const addr = hit.address || {};
    const road = addr.road || addr.pedestrian || addr.residential || "";
    const houseNumber = addr.house_number || "";
    const postcode = addr.postcode || zip || "";
    const town = addr.city || addr.town || addr.village || addr.municipality || city || "";
    let formatted = "";
    if (road) {
      formatted = `${road}${houseNumber ? " " + houseNumber : ""}`;
      if (postcode || town) formatted += `, ${[postcode, town].filter(Boolean).join(" ")}`;
    } else {
      // Fallback: use what user typed
      formatted = [address, [zip, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    }
    return new Response(JSON.stringify({
      found: true,
      latitude: parseFloat(hit.lat),
      longitude: parseFloat(hit.lon),
      display_name: formatted,
      raw_display_name: hit.display_name,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
