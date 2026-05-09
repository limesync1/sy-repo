import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AgreementInterval =
  | "engangskøb" | "ugentlig" | "hver_14_dag" | "hver_4_uge"
  | "månedlig" | "kvartalsvis" | "halvårlig" | "årlig" | "custom";

export type AgreementStatus = "draft" | "pending_approval" | "active" | "paused" | "ended" | "cancelled";
export type OccurrenceStatus = "planned" | "completed" | "cancelled" | "skipped";
export type AgreementBillingModel = "per_visit" | "monthly_consolidated";

export type Agreement = {
  id: string;
  business_id: string;
  business_customer_id: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  company_name: string | null;
  cvr: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string;
  end_date: string | null;
  interval: AgreementInterval;
  interval_days: number | null;
  default_route_template_id: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  estimated_duration_minutes: number | null;
  employee_ids: string[];
  total_amount: number;
  notes: string | null;
  status: AgreementStatus;
  billing_model: AgreementBillingModel;
  payment_terms_days: number | null;
  created_at: string;
  updated_at: string;
};

export type AgreementItem = {
  id: string;
  agreement_id: string;
  service_id: string | null;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  details: Record<string, unknown>;
};

export type AgreementOccurrence = {
  id: string;
  agreement_id: string;
  business_id: string;
  occurrence_date: string;
  sequence_index: number;
  route_id: string | null;
  status: OccurrenceStatus;
  employee_ids: string[];
  planned_arrival: string | null;
  completed_at: string | null;
  notes: string | null;
  payment_status: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  due_date: string | null;
  invoice_external_id: string | null;
  invoice_status: string | null;
  invoiced_at: string | null;
};

/* ─── Agreements list ─── */
export const useAgreements = (businessId: string | undefined, status?: AgreementStatus | "all") => {
  return useQuery({
    queryKey: ["agreements", businessId, status ?? "all"],
    enabled: !!businessId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("agreements").select("*").eq("business_id", businessId!);
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Agreement[];
    },
  });
};

export const useAgreement = (id: string | undefined) => {
  return useQuery({
    queryKey: ["agreement", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("agreements").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as Agreement | null;
    },
  });
};

export const useAgreementItems = (agreementId: string | undefined) => {
  return useQuery({
    queryKey: ["agreement-items", agreementId],
    enabled: !!agreementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_items")
        .select("*")
        .eq("agreement_id", agreementId!);
      if (error) throw error;
      return (data || []) as AgreementItem[];
    },
  });
};

/* ─── Create / update / delete ─── */
export const useCreateAgreement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, ...agreement }: Partial<Agreement> & {
      business_id: string;
      customer_name: string;
      customer_email: string;
      start_date: string;
      items?: Omit<AgreementItem, "id" | "agreement_id">[];
    }) => {
      const { data, error } = await supabase
        .from("agreements")
        .insert(agreement as any)
        .select("*")
        .single();
      if (error) throw error;
      const created = data as Agreement;
      if (items && items.length > 0) {
        const { error: itemsErr } = await supabase
          .from("agreement_items")
          .insert(items.map((i) => ({ ...i, agreement_id: created.id })) as any);
        if (itemsErr) throw itemsErr;
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreements"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke oprette aftale"),
  });
};

export const useUpdateAgreement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Agreement> & { id: string }) => {
      const { data, error } = await supabase
        .from("agreements")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Agreement;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["agreements"] });
      qc.invalidateQueries({ queryKey: ["agreement", vars.id] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke opdatere aftale"),
  });
};

export const useDeleteAgreement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agreements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agreements"] }),
    onError: (e: any) => toast.error(e.message || "Kunne ikke slette aftale"),
  });
};

/* ─── Occurrences ─── */
export const useEnsureOccurrences = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ business_id, until_date }: { business_id: string; until_date: string }) => {
      const { data, error } = await supabase.rpc("ensure_agreement_occurrences", {
        _business_id: business_id,
        _until_date: until_date,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreement-occurrences"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke generere forekomster"),
  });
};

export const useOccurrencesInRange = (businessId: string | undefined, from: string, to: string) => {
  return useQuery({
    queryKey: ["agreement-occurrences", businessId, from, to],
    enabled: !!businessId && !!from && !!to,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_occurrences")
        .select("*, agreements!inner(customer_name, company_name, address, zip_code, city, latitude, longitude, default_route_template_id, total_amount)")
        .eq("business_id", businessId!)
        .gte("occurrence_date", from)
        .lte("occurrence_date", to)
        .order("occurrence_date", { ascending: true });
      if (error) throw error;
      return (data || []) as Array<AgreementOccurrence & { agreements: any }>;
    },
  });
};

export const useOccurrencesForAgreement = (agreementId: string | undefined) => {
  return useQuery({
    queryKey: ["agreement-occurrences", "by-agreement", agreementId],
    enabled: !!agreementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_occurrences")
        .select("*")
        .eq("agreement_id", agreementId!)
        .order("occurrence_date", { ascending: true });
      if (error) throw error;
      return (data || []) as AgreementOccurrence[];
    },
  });
};

export const useUpdateOccurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<AgreementOccurrence> & { id: string }) => {
      const { data, error } = await supabase
        .from("agreement_occurrences")
        .update(patch as any)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as AgreementOccurrence;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreement-occurrences"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke opdatere forekomst"),
  });
};

export const INTERVAL_LABELS: Record<AgreementInterval, string> = {
  "engangskøb": "Engangskøb",
  "ugentlig": "Hver uge",
  "hver_14_dag": "Hver 14. dag",
  "hver_4_uge": "Hver 4. uge",
  "månedlig": "Månedlig",
  "kvartalsvis": "Kvartalsvis",
  "halvårlig": "Halvårlig",
  "årlig": "Årlig",
  "custom": "Brugerdefineret",
};