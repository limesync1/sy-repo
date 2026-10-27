import { supabase } from "@/integrations/supabase/client";

type CvrReply = { data: any; error: any };
const cache = new Map<string, CvrReply>();
const pending = new Map<string, Promise<CvrReply>>();

const direct = async (cvr: string): Promise<CvrReply | null> => {
  const res = await fetch(`https://cvrapi.dk/api?vat=${cvr}&country=dk`, { signal: AbortSignal.timeout(3000) });
  const j: any = await res.json().catch(() => null);
  if (res.ok && j?.name) {
    return {
      data: {
        found: true, cvr, name: j.name,
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
  if (res.status === 404 || j?.error === "NOT_FOUND") return { data: { found: false, reason: "not_found" }, error: null };
  return null; // kvote/blokering → lad serveren svare
};

/**
 * CVR-opslag. Spørger cvrapi.dk direkte fra browseren og — hvis den ikke har
 * svaret inden for 500 ms — samtidig serverfunktionen; det første brugbare svar
 * vinder. Svar huskes i sessionen, så samme CVR er øjeblikkeligt næste gang.
 */
export function lookupCvr(cvr: string): Promise<CvrReply> {
  const cleaned = String(cvr || "").replace(/\D/g, "");
  if (cleaned.length !== 8) return Promise.resolve({ data: { found: false, reason: "not_found" }, error: null });
  const hit = cache.get(cleaned);
  if (hit) return Promise.resolve(hit);
  const existing = pending.get(cleaned);
  if (existing) return existing;

  const request = new Promise<CvrReply>((resolve) => {
    let done = false;
    let failures = 0;
    let serverStarted = false;
    const finish = (r: CvrReply) => {
      if (done) return;
      done = true;
      if (!r.error && r.data && r.data.reason !== "service_down") cache.set(cleaned, r);
      resolve(r);
    };
    const fail = (r: CvrReply) => { failures += 1; if (failures >= 2) finish(r); };
    const startServer = () => {
      if (serverStarted || done) return;
      serverStarted = true;
      supabase.functions.invoke("cvr-lookup", { body: { cvr: cleaned } })
        .then((r) => (r.error ? fail(r) : finish(r)))
        .catch((e) => fail({ data: null, error: e }));
    };
    const hedge = setTimeout(startServer, 500);
    direct(cleaned)
      .then((r) => {
        if (r) { clearTimeout(hedge); finish(r); }
        else { clearTimeout(hedge); startServer(); fail({ data: { found: false, reason: "service_down" }, error: null }); }
      })
      .catch(() => { clearTimeout(hedge); startServer(); fail({ data: { found: false, reason: "service_down" }, error: null }); });
  }).finally(() => pending.delete(cleaned));
  pending.set(cleaned, request);
  return request;
}
