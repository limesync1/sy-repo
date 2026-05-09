import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Henter den minimale aftale-kontekst for et stop, så vi ved om det er en serie
 * (interval != engangskøb) og hvornår den løber.
 */
export const useOccurrenceContext = (occurrenceId: string | null | undefined) => {
  return useQuery({
    queryKey: ["agreement-occurrence-context", occurrenceId],
    enabled: !!occurrenceId,
    queryFn: async () => {
      const { data: occ, error: occErr } = await supabase
        .from("agreement_occurrences")
        .select("id, agreement_id, occurrence_date, status, sequence_index")
        .eq("id", occurrenceId!)
        .maybeSingle();
      if (occErr) throw occErr;
      if (!occ) return null;
      const { data: ag, error: agErr } = await supabase
        .from("agreements")
        .select("id, interval, interval_days, start_date, end_date, customer_name, company_name, status")
        .eq("id", occ.agreement_id)
        .maybeSingle();
      if (agErr) throw agErr;

      // Tæl fremtidige planlagte forekomster
      const { count: futureCount } = await supabase
        .from("agreement_occurrences")
        .select("id", { count: "exact", head: true })
        .eq("agreement_id", occ.agreement_id)
        .gt("occurrence_date", occ.occurrence_date)
        .eq("status", "planned");

      return {
        occurrence: occ,
        agreement: ag,
        isSeries: ag?.interval && ag.interval !== "engangskøb",
        futurePlannedCount: futureCount ?? 0,
      };
    },
  });
};

/** Aflys KUN denne forekomst og fjern stop fra ruten. */
export const useCancelOccurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (occurrenceId: string) => {
      // Find evt. tilknyttet route_stop og slet det
      const { data: stop } = await supabase
        .from("route_stops")
        .select("id, route_id")
        .eq("agreement_occurrence_id", occurrenceId)
        .maybeSingle();
      if (stop?.id) {
        await supabase.from("route_stops").delete().eq("id", stop.id);
      }
      const { error } = await supabase
        .from("agreement_occurrences")
        .update({ status: "cancelled", route_id: null })
        .eq("id", occurrenceId);
      if (error) throw error;
      return { stopId: stop?.id, routeId: stop?.route_id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["route-stops"] });
      qc.invalidateQueries({ queryKey: ["agreement-occurrences"] });
      qc.invalidateQueries({ queryKey: ["agreement-occurrence-context"] });
      toast.success("Denne gang er aflyst");
    },
    onError: (e: any) => toast.error(e.message ?? "Kunne ikke aflyse"),
  });
};

/**
 * Afslut hele serien fra og med denne dato:
 *  - sætter agreement.end_date = occurrence_date - 1 dag
 *  - aflyser denne + alle fremtidige planlagte forekomster
 *  - fjerner deres route_stops
 */
export const useEndSeriesFromOccurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (occurrenceId: string) => {
      const { data: occ, error: occErr } = await supabase
        .from("agreement_occurrences")
        .select("id, agreement_id, occurrence_date")
        .eq("id", occurrenceId)
        .single();
      if (occErr) throw occErr;

      // Find alle forekomster fra og med denne dato
      const { data: futureOccs, error: futErr } = await supabase
        .from("agreement_occurrences")
        .select("id")
        .eq("agreement_id", occ.agreement_id)
        .gte("occurrence_date", occ.occurrence_date)
        .eq("status", "planned");
      if (futErr) throw futErr;
      const ids = (futureOccs ?? []).map((o) => o.id);

      if (ids.length > 0) {
        await supabase.from("route_stops").delete().in("agreement_occurrence_id", ids);
        await supabase
          .from("agreement_occurrences")
          .update({ status: "cancelled", route_id: null })
          .in("id", ids);
      }

      // Sæt slutdato dagen før
      const date = new Date(occ.occurrence_date);
      date.setDate(date.getDate() - 1);
      const endDate = date.toISOString().slice(0, 10);
      await supabase
        .from("agreements")
        .update({ end_date: endDate, status: "ended" })
        .eq("id", occ.agreement_id);

      return { cancelled: ids.length, endDate };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["route-stops"] });
      qc.invalidateQueries({ queryKey: ["agreements"] });
      qc.invalidateQueries({ queryKey: ["agreement-occurrences"] });
      qc.invalidateQueries({ queryKey: ["agreement-occurrence-context"] });
      toast.success(`Serien afsluttet — ${res.cancelled} fremtidige besøg aflyst`);
    },
    onError: (e: any) => toast.error(e.message ?? "Kunne ikke afslutte serien"),
  });
};