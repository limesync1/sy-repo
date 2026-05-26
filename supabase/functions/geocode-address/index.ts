// Geokod danske adresser via DAWA (Danmarks officielle adresse-API).
// Bruger struktur=mini for lille payload + fuzzy=1 for typo-tolerance.
// Falder tilbage til Nominatim hvis DAWA er nede.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GeoHit = {
  latitude: number;
  longitude: number;
  display_name: string;
  confidence: "exact" | "fuzzy" | "approximate";
  matched_address?: string;
};

const safeFetch = async (url: string): Promise<any | null> => {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Serviceydere/1.0 (kontakt@serviceydere.dk)",
        // Tvinger ukomprimeret svar — Deno-runtime fejler nogle gange på
        // gzip-streams med "unexpected end of file".
        "Accept-Encoding": "identity",
        "Accept": "application/json",
      },
    });
    if (!r.ok) return null;
    const text = await r.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.warn("fetch failed", url.slice(0, 80), String(e));
    return null;
  }
};

const dawaSearch = async (query: string, fuzzy: boolean): Promise<GeoHit | null> => {
  if (!query.trim()) return null;
  const url = `https://api.dataforsyningen.dk/adgangsadresser?q=${encodeURIComponent(query)}${fuzzy ? "&fuzzy=" : ""}&per_side=1&struktur=mini`;
  const data = await safeFetch(url);
  if (!Array.isArray(data) || data.length === 0) return null;
  const hit = data[0];
  if (hit?.x == null || hit?.y == null) return null;
  return {
    latitude: Number(hit.y),
    longitude: Number(hit.x),
    display_name: hit.betegnelse || query,
    matched_address: hit.betegnelse,
    confidence: fuzzy ? "fuzzy" : "exact",
  };
};

const nominatim = async (query: string): Promise<GeoHit | null> => {
  if (!query.trim()) return null;
  const data = await safeFetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=dk&q=${encodeURIComponent(query + ", Danmark")}`,
  );
  if (!Array.isArray(data) || data.length === 0) return null;
  const hit = data[0];
  return {
    latitude: parseFloat(hit.lat),
    longitude: parseFloat(hit.lon),
    display_name: hit.display_name,
    confidence: "approximate",
  };
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
    // Forsøg fra mest til mindst præcis. Eksakt match først, derefter fuzzy.
    const queries = [
      [address, cityLine].filter(Boolean).join(", "),
      [address, city].filter(Boolean).join(", "),
      [address, zip].filter(Boolean).join(" "),
      address,
      cityLine,
    ].filter((q, i, arr) => q.trim() && arr.indexOf(q) === i);

    // 1) DAWA eksakt
    for (const q of queries) {
      const hit = await dawaSearch(q, false);
      if (hit) {
        return new Response(JSON.stringify({ found: true, ...hit }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // 2) DAWA fuzzy — fanger typografi-fejl
    for (const q of queries) {
      const hit = await dawaSearch(q, true);
      if (hit) {
        return new Response(JSON.stringify({ found: true, ...hit }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // 3) Nominatim — sidste udvej
    for (const q of queries) {
      const hit = await nominatim(q);
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
