import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RouteTemplate = {
  id: string;
  business_id: string;
  name: string;
  weekday: number | null; // 0=mon..6=sun
  default_employee_id: string | null;
  start_address: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  start_from_home: boolean;
  planned_start_time: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RouteTemplateInput = Partial<Omit<RouteTemplate, "id" | "created_at" | "updated_at">> & {
  business_id: string;
  name: string;
};

export const useRouteTemplates = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["route-templates", businessId],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_templates")
        .select("*")
        .eq("business_id", businessId!)
        .order("weekday", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as RouteTemplate[];
    },
  });
};

export const useCreateRouteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RouteTemplateInput) => {
      const { data, error } = await supabase
        .from("route_templates")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data as RouteTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-templates"] });
      toast.success("Rute-skabelon oprettet");
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke oprette skabelon"),
  });
};

export const useUpdateRouteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RouteTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("route_templates")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as RouteTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-templates"] });
      toast.success("Skabelon opdateret");
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke opdatere skabelon"),
  });
};

export const useDeleteRouteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("route_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-templates"] });
      toast.success("Skabelon slettet");
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke slette skabelon"),
  });
};

export const WEEKDAY_LABELS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];