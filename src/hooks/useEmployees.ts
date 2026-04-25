import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Employee = Tables<"employees">;

/* ─── List employees for a business ─── */
export const useEmployees = (businessId?: string) => {
  return useQuery({
    queryKey: ["employees", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!businessId,
  });
};

/* ─── Create employee directly (auto-creates auth user + sends welcome email) ─── */
export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      business_id: string;
      name: string;
      email: string;
      phone?: string;
      title?: string;
      commission_pct?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("create-employee", {
        body: {
          business_id: input.business_id,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone?.trim() || null,
          title: input.title?.trim() || null,
          commission_pct: typeof input.commission_pct === "number" ? input.commission_pct : 0,
        },
      });
      if (error) {
        // Try to extract real error message from edge function response
        const ctx: any = (error as any).context;
        let serverMsg: string | undefined;
        try {
          const body = await ctx?.json?.();
          serverMsg = body?.error;
        } catch { /* ignore */ }
        throw new Error(serverMsg || error.message || "Kunne ikke oprette medarbejder");
      }
      if (data?.error) throw new Error(data.error);
      return data as { ok: true; employee: Employee; emailSent: boolean; accountAlreadyExisted: boolean };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employees", vars.business_id] });
    },
  });
};

/* ─── Update employee (toggle is_active, edit name/phone/title) ─── */
export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; business_id: string } & Partial<Employee>) => {
      const { id, business_id, ...rest } = input;
      const { error } = await supabase.from("employees").update(rest).eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employees", vars.business_id] });
    },
  });
};

/* ─── Delete employee ─── */
export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; business_id: string }) => {
      const { error } = await supabase.from("employees").delete().eq("id", input.id);
      if (error) throw error;
      return { id: input.id };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employees", vars.business_id] });
    },
  });
};

/* ─── Send password reset email to an employee ─── */
export const useResetEmployeePassword = () => {
  return useMutation({
    mutationFn: async (input: { employee_id: string }) => {
      const { data, error } = await supabase.functions.invoke("reset-employee-password", {
        body: { employee_id: input.employee_id },
      });
      if (error) {
        const ctx: any = (error as any).context;
        let serverMsg: string | undefined;
        try {
          const body = await ctx?.json?.();
          serverMsg = body?.error;
        } catch { /* ignore */ }
        throw new Error(serverMsg || error.message || "Kunne ikke sende nulstillingsmail");
      }
      if (data?.error) throw new Error(data.error);
      return data as { ok: true; emailSent: boolean };
    },
  });
};
