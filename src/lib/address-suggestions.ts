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
    const { data, error } = await supabase.functions.invoke("employee-route-geocode", { body: { address: query.trim(), suggestions: true } });
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