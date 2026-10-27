import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AddressSuggestion = { address: string; zip_code: string; city: string; latitude: number; longitude: number };
const cache = new Map<string, { expires: number; values: AddressSuggestion[] }>();
const pending = new Map<string, Promise<AddressSuggestion[]>>();

export function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const key = query.trim().toLocaleLowerCase("da");
  if (key.length < 4) return Promise.resolve([]);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.values);
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke(session ? "employee-route-geocode" : "geocode-address", { body: { address: query.trim(), suggestions: true } });
    if (error) {
      let message = "Adresseforslag kunne ikke hentes. Du kan indtaste adressen manuelt.";
      if (error instanceof FunctionsHttpError) {
        const payload = await error.context.json().catch(() => null);
        if (typeof payload?.error === "string") message = payload.error;
      }
      throw new Error(message);
    }
    const values = Array.isArray(data?.suggestions) ? data.suggestions as AddressSuggestion[] : [];
    if (cache.size >= 100) cache.clear();
    cache.set(key, { expires: Date.now() + 300_000, values });
    return values;
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
/** Seneste resultater for et kortere præfiks, filtreret — vises med det samme mens der hentes. */
export function instantAddressMatches(query: string): AddressSuggestion[] {
  const key = query.trim().toLocaleLowerCase("da");
  if (key.length < 3) return [];
  let best: AddressSuggestion[] = [];
  for (const [k, entry] of cache) {
    if (entry.expires < Date.now() || !key.startsWith(k.slice(0, 3))) continue;
    const words = key.split(/[\s,]+/).filter(Boolean);
    const hits = entry.values.filter((v) => {
      const hay = `${v.address} ${v.zip_code} ${v.city}`.toLocaleLowerCase("da");
      return words.every((w) => hay.includes(w));
    });
    if (hits.length > best.length) best = hits;
  }
  return best.slice(0, 5);
}

const photonCache = new Map<string, AddressSuggestion[]>();
/** Hurtigt, gratis opslag direkte fra browseren (Danmark), uden servertur. */
export async function searchAddressesDirect(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const key = query.trim().toLocaleLowerCase("da");
  if (key.length < 3) return [];
  const hit = photonCache.get(key);
  if (hit) return hit;
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", "8");
  url.searchParams.set("bbox", "7.9,54.5,15.3,57.9");
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("direct lookup failed");
  const payload = await res.json();
  const seen = new Set<string>();
  const values = (Array.isArray(payload?.features) ? payload.features : []).flatMap((f: any) => {
    const p = f?.properties ?? {}; const c = f?.geometry?.coordinates;
    if (p.countrycode !== "DK" || !p.street || !p.housenumber || !/^\d{4}$/.test(String(p.postcode || "")) || !Array.isArray(c)) return [];
    const s = { address: `${p.street} ${p.housenumber}`, zip_code: String(p.postcode), city: p.city || p.town || p.village || p.district || "", latitude: c[1], longitude: c[0] };
    const k = `${s.address}|${s.zip_code}`;
    if (!s.city || seen.has(k)) return [];
    seen.add(k);
    return [s];
  }).slice(0, 5);
  if (photonCache.size > 200) photonCache.clear();
  photonCache.set(key, values);
  return values;
}

/**
 * Smart søgning: viser straks filtrerede tidligere forslag, så det hurtigste
 * svar (browser eller server), og til sidst serverens mere præcise svar.
 */
export function searchAddressesProgressive(
  query: string,
  onUpdate: (values: AddressSuggestion[], final: boolean) => void,
  onError: (message: string) => void,
): () => void {
  const ctrl = new AbortController();
  let cancelled = false;
  let shown = false;
  let pendingCount = 2;
  let lastError = "";
  const instant = instantAddressMatches(query);
  if (instant.length) { onUpdate(instant, false); }
  const settle = () => {
    pendingCount -= 1;
    if (pendingCount === 0 && !cancelled && !shown) {
      if (lastError) onError(lastError); else onUpdate([], true);
    }
  };
  const timeout = setTimeout(() => ctrl.abort(), 6000);
  searchAddressesDirect(query, ctrl.signal)
    .then((v) => { if (!cancelled && v.length && !shown) { onUpdate(v, pendingCount === 1); shown = true; } })
    .catch(() => {})
    .finally(settle);
  if (query.trim().length >= 4) {
    searchAddresses(query)
      .then((v) => { if (!cancelled && v.length) { onUpdate(v, true); shown = true; } })
      .catch((e) => { lastError = e instanceof Error ? e.message : "Adresseforslag kunne ikke hentes."; })
      .finally(settle);
  } else settle();
  return () => { cancelled = true; clearTimeout(timeout); ctrl.abort(); };
}
