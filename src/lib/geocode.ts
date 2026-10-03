import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type GeocodeResult = { latitude: number; longitude: number };
export class GeocodeServiceError extends Error {}

/**
 * Geokod en dansk adresse via et loginbeskyttet serveropslag.
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  const q = address?.trim();
  if (!q || q.length < 4) return null;
  const { data, error } = await supabase.functions.invoke("employee-route-geocode", { body: { address: q } });
  if (error) {
    const detail = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    console.error("[geocode] Adresseopslaget fejlede", detail);
    throw new GeocodeServiceError("Adressetjenesten svarer ikke lige nu");
  }
  if (!data?.found) return null;
  return typeof data.latitude === "number" && typeof data.longitude === "number"
    ? { latitude: data.latitude, longitude: data.longitude }
    : null;
};
