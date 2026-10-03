// DAWA ("Danmarks Adressers Web API") — gratis, ingen nøgle.
// Bruges til at udfylde lat/lng for rute-stop som mangler koordinater,
// så kørselsguidens kort altid kan vise en rute i stedet for at vise
// "Ingen koordinater tilgængelige".
export type GeocodeResult = { latitude: number; longitude: number };

const fetchJson = async (url: string, signal: AbortSignal) => {
  const response = await fetch(url, { signal });
  return response.ok ? response.json() : null;
};

const coordinateResult = (value: any): GeocodeResult | null => {
  const latitude = value?.y ?? value?.data?.y;
  const longitude = value?.x ?? value?.data?.x;
  return typeof latitude === "number" && typeof longitude === "number"
    ? { latitude, longitude }
    : null;
};

/**
 * Geokod en fritekst-adresse via DAWA's adressesøgning.
 * Returnerer null hvis adressen ikke entydigt kan slås op (f.eks. for kort
 * søgestreng eller ingen match) — kaldende kode skal håndtere det.
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  const q = address?.trim();
  if (!q || q.length < 4) return null;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 6000);
  try {
    const exactRows = await fetchJson(
      `https://api.dataforsyningen.dk/adresser?q=${encodeURIComponent(q)}&struktur=mini&per_side=1`,
      controller.signal,
    );
    const exact = coordinateResult(Array.isArray(exactRows) ? exactRows[0] : null);
    if (exact) return exact;

    // Autocomplete er mere tolerant over for kommaer, manglende postnummer
    // og adresser skrevet som fritekst. Slå derefter det valgte adresse-id op.
    const suggestions = await fetchJson(
      `https://api.dataforsyningen.dk/autocomplete?q=${encodeURIComponent(q)}&type=adresse&caretpos=${q.length}&supplerendebynavn=true&stormodtagerpostnumre=true&multilinje=true`,
      controller.signal,
    );
    const suggestion = Array.isArray(suggestions) ? suggestions[0] : null;
    const embedded = coordinateResult(suggestion);
    if (embedded) return embedded;
    const id = suggestion?.adresse?.id ?? suggestion?.data?.id;
    if (!id) return null;
    const address = await fetchJson(
      `https://api.dataforsyningen.dk/adresser/${encodeURIComponent(id)}?struktur=mini`,
      controller.signal,
    );
    return coordinateResult(address);
  } catch (error) {
    console.warn("[geocode] Adressen kunne ikke slås op", error);
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
};
