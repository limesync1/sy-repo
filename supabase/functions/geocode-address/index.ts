// Geocode danske adresser via DAWA (Danmarks Adressers Web API) — officielt,
// hurtigt og uden nøgle. Falder tilbage til Nominatim hvis DAWA ikke svarer.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GeoHit = { latitude: number; longitude: number; display_name: string; raw_display_name?: string };

const dawaLookup = async (query: string): Promise<GeoHit | null> => {
  if (!query.trim()) return null;
  try {
    const r = await fetch(
      `https://api.dataforsyningen.dk/datavask/adresser?betegnelse=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "Serviceydere/1.0" } },
    );
    if (r.ok) {
      const j = await r.json();
      const hit = Array.isArray(j?.resultater) ? j.resultater[0]?.adresse : null;
      if (hit?.x != null && hit?.y != null) {
        return { latitude: Number(hit.y), longitude: Number(hit.x), display_name: hit.betegnelse || query };
      }
    }
  } catch (e) { console.warn("DAWA datavask failed", e); }
  try {
    const r = await fetch(
      `https://api.dataforsyningen.dk/adgangsadresser?q=${encodeURIComponent(query)}&fuzzy=&per_side=1`,
      { headers: { "User-Agent": "Serviceydere/1.0" } },
    );
    if (r.ok) {
      const j = await r.json();
      const hit = Array.isArray(j) ? j[0] : null;
      if (hit?.adgangspunkt?.koordinater) {
        const [lon, lat] = hit.adgangspunkt.koordinater;
        return {
          latitude: Number(lat),
          longitude: Number(lon),
          display_name: `${hit.vejstykke?.navn || ""} ${hit.husnr || ""}, ${hit.postnummer?.nr || ""} ${hit.postnummer?.navn || ""}`.trim(),
        };
      }
    }
  } catch (e) { console.warn("DAWA adgangsadresser failed", e); }
  return null;
};

const nominatimLookup = async (query: string): Promise<GeoHit | null> => {
  if (!query.trim()) return null;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=dk&q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "Serviceydere/1.0 (kontakt@serviceydere.dk)" } },
    );
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const hit = data[0];
    const a = hit.address || {};
    const road = a.road || a.pedestrian || a.residential || "";
    const formatted = road
      ? `${road}${a.house_number ? " " + a.house_number : ""}, ${[a.postcode, a.city || a.town || a.village || a.municipality].filter(Boolean).join(" ")}`
      : hit.display_name;
    return {
      latitude: parseFloat(hit.lat),
      longitude: parseFloat(hit.lon),
      display_name: formatted,
      raw_display_name: hit.display_name,
    };
  } catch (e) { console.warn("Nominatim failed", e); return null; }
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

    const cityLine = [zip, city].filter(Boolean).join(" ");
    const queries = [
      [address, cityLine].filter(Boolean).join(", "),
      [address, city].filter(Boolean).join(", "),
      [address, zip].filter(Boolean).join(", "),
      address,
      cityLine,
    ].filter((q, i, arr) => q && arr.indexOf(q) === i);

    for (const q of queries) {
      const hit = await dawaLookup(q);
      if (hit) {
        return new Response(JSON.stringify({ found: true, ...hit }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    for (const q of queries) {
      const hit = await nominatimLookup(`${q}, Danmark`);
      if (hit) {
        return new Response(JSON.stringify({ found: true, ...hit }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify({ found: false }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
