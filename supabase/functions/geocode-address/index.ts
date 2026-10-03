// Geokod danske adresser via DAWA (Danmarks officielle adresse-API).
// Bruger struktur=mini for lille payload + fuzzy=1 for typo-tolerance.
// Falder tilbage til Nominatim hvis DAWA er nede.

import postalTowns from "../_shared/postal-towns.json" with { type: "json" };

const guestRequests = new Map<string, { count: number; until: number }>();
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
    // Guest checkout suggestions use an unmetered address provider, never the
    // private Google key. Bound input, requests and time spent on the provider.
    if (body.suggestions === true) {
      const query = typeof body.address === "string" ? body.address.trim() : "";
      const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (query.length < 4 || query.length > 300) return reply({ error: "Indtast en gyldig adresse" }, 400);
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
      const now = Date.now();
      if (guestRequests.size > 1000) for (const [key, entry] of guestRequests) if (entry.until < now) guestRequests.delete(key);
      if (guestRequests.size > 2000) return reply({ error: "Adresseforslag er travle. Prøv igen om lidt." }, 429);
      const entry = guestRequests.get(ip);
      if (entry && entry.until > now && entry.count >= 20) return reply({ error: "Vent lidt før næste adresseopslag." }, 429);
      guestRequests.set(ip, entry && entry.until > now ? { ...entry, count: entry.count + 1 } : { count: 1, until: now + 60_000 });
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", query); url.searchParams.set("limit", "5"); url.searchParams.set("lang", "en");
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return reply({ error: "Adresseforslag kunne ikke hentes. Indtast adressen manuelt." }, 503);
      const payload = await response.json();
      const suggestions = (Array.isArray(payload.features) ? payload.features : []).flatMap((hit: any) => {
        const p = hit.properties ?? {}; const coords = hit.geometry?.coordinates;
        const city = (postalTowns as Record<string, string>)[p.postcode];
        if (p.countrycode !== "DK" || !p.street || !p.housenumber || !city || !Array.isArray(coords) || !coords.every(Number.isFinite)) return [];
        return [{ address: `${p.street} ${p.housenumber}`, zip_code: p.postcode, city, latitude: coords[1], longitude: coords[0] }];
      });
      return reply({ suggestions });
    }
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
