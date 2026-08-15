// Fravær (sygdom, ferie, andet) for medarbejdere.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EmployeeAbsence = {
  id: string;
  business_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  absence_type: "sick" | "vacation" | "other";
  note: string | null;
};

export const ABSENCE_LABEL: Record<EmployeeAbsence["absence_type"], string> = {
  sick: "Sygemeldt",
  vacation: "Ferie",
  other: "Fravær",
};

/** Fravær der overlapper [from, to] for en virksomhed. */
export const useEmployeeAbsences = (businessId?: string, from?: string, to?: string) =>
  useQuery<EmployeeAbsence[]>({
    queryKey: ["employee-absences", businessId, from, to],
    enabled: !!businessId && !!from && !!to,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_absences")
        .select("id, business_id, employee_id, start_date, end_date, absence_type, note")
        .eq("business_id", businessId!)
        .lte("start_date", to!)
        .gte("end_date", from!);
      if (error) throw error;
      return (data || []) as EmployeeAbsence[];
    },
  });

export const useDeleteEmployeeAbsence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_absences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-absences"] });
      toast.success("Fravær fjernet — medarbejderen er tilgængelig igen");
    },
    onError: (e: any) => toast.error(e?.message || "Kunne ikke fjerne fraværet"),
  });
};