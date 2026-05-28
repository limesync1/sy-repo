// Delte hjælpefunktioner til den mobile ruteplanlægger.
// Holder logik for "aftale → rute"-tildeling konsistent med desktop-flowet
// i src/pages/RoutePlanner.tsx uden at duplikere hele komponenten.
import { supabase } from "@/integrations/supabase/client";

/** Kundens faktisk gældende ydelser — bruger justerede linjer hvis kunden
 *  har accepteret et justeret tilbud, ellers de oprindelige order_items. */
export const effectiveJobItems = (job: any): any[] =>
  job?.business_response === "adjusted" &&
  job?.customer_response === "accepted" &&
  Array.isArray(job?.adjusted_details?.items)
    ? job.adjusted_details.items
    : job?.order_items || [];

/** Kort tekst-resumé af ydelserne på en aftale. */
export const serviceSummaryForJob = (job: any): string =>
  effectiveJobItems(job)
    .map((it: any) => (it.quantity > 1 ? `${it.quantity}× ${it.service_name}` : it.service_name))
    .join(", ") || "Ingen ydelser angivet";

/** Kundens ønskede dato — preferred_date primært, ellers next_service_date. */
export const effectiveJobDate = (job: any): string | null => {
  if (job?.preferred_date) return String(job.preferred_date).slice(0, 10);
  if (job?.next_service_date) return String(job.next_service_date).slice(0, 10);
  return null;
};

/** Samlet adresse-streng til visning. */
export const jobAddress = (job: any): string =>
  job?.address || [job?.zip_code, job?.city].filter(Boolean).join(" ") || "Ingen adresse";

/** Knytter en gentagende aftale til den valgte rute så fremtidige
 *  forekomster projiceres på ruten. Bedst-effort — må aldrig kaste. */
export const linkAgreementToRoute = async (orderId: string, routeId: string) => {
  try {
    await supabase
      .from("subscriptions")
      .update({ preferred_route_id: routeId })
      .eq("order_id", orderId)
      .eq("status", "active")
      .neq("interval", "engangskøb");
  } catch (err) {
    console.warn("Kunne ikke knytte aftale til rute (projektion)", err);
  }
  try {
    const { data: occs } = await supabase
      .from("agreement_occurrences")
      .select("agreement_id")
      .eq("legacy_order_id", orderId);
    const agreementIds = Array.from(
      new Set((occs || []).map((o: any) => o.agreement_id).filter(Boolean) as string[]),
    );
    if (agreementIds.length > 0) {
      await supabase
        .from("agreements")
        .update({ preferred_route_id: routeId })
        .in("id", agreementIds)
        .neq("interval", "engangskøb")
        .eq("status", "active");
    }
  } catch (err) {
    console.warn("Kunne ikke knytte ny aftale til rute (projektion)", err);
  }
};

/** Er aftalen klar til at blive planlagt (kunde har godkendt)? */
export const isJobPending = (job: any): boolean => job?.status === "pending";