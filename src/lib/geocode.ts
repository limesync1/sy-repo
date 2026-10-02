// DAWA ("Danmarks Adressers Web API") — gratis, ingen nøgle.
// Bruges til at udfylde lat/lng for rute-stop som mangler koordinater,
// så kørselsguidens kort altid kan vise en rute i stedet for at vise
// "Ingen koordinater tilgængelige".
export type GeocodeResult = { latitude: number; longitude: number };

/**
 * Geokod en fritekst-adresse via DAWA's adressesøgning.
 * Returnerer null hvis adressen ikke entydigt kan slås op (f.eks. for kort
 * søgestreng eller ingen match) — kaldende kode skal håndtere det.
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  const q = address?.trim();
  if (!q || q.length < 4) return null;
  try {
    const url = `https://api.dataforsyningen.dk/adresser?q=${encodeURIComponent(q)}&struktur=mini&per_side=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const rows = await res.json();
    const hit = Array.isArray(rows) ? rows[0] : null;
    const lat = hit?.y;
    const lng = hit?.x;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return { latitude: lat, longitude: lng };
  } catch {
    return null;
  }
};
