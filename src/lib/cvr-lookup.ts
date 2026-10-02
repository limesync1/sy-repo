import { supabase } from "@/integrations/supabase/client";

/**
 * CVR-opslag via cvrapi.dk's åbne API. Kaldes først direkte fra brugerens
 * browser (egen kvote pr. IP), og falder tilbage til serverfunktionen.
 * Returnerer samme form som `supabase.functions.invoke("cvr-lookup")`.
 */
export async function lookupCvr(cvr: string): Promise<{ data: any; error: any }> {
  const cleaned = String(cvr || "").replace(/\D/g, "");
  if (cleaned.length !== 8) return { data: { found: false, reason: "not_found" }, error: null };
  try {
    const res = await fetch(`https://cvrapi.dk/api?vat=${cleaned}&country=dk`);
    const j: any = await res.json().catch(() => null);
    if (res.ok && j?.name) {
      return {
        data: {
          found: true,
          cvr: cleaned,
          name: j.name,
          address: j.address || null,
          zip_code: j.zipcode ? String(j.zipcode) : null,
          city: j.city || null,
          phone: j.phone ? String(j.phone) : null,
          email: j.email || null,
          industry: j.industrydesc || null,
        },
        error: null,
      };
    }
    if (res.status === 404 || j?.error === "NOT_FOUND") {
      return { data: { found: false, reason: "not_found" }, error: null };
    }
  } catch { /* fald tilbage til serveren */ }
  return supabase.functions.invoke("cvr-lookup", { body: { cvr: cleaned } });
}
