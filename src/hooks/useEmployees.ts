import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Employee = Tables<"employees">;
export type EmployeeInvitation = Tables<"employee_invitations">;

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

/* ─── List pending invitations ─── */
export const useEmployeeInvitations = (businessId?: string) => {
  return useQuery({
    queryKey: ["employee_invitations", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("employee_invitations")
        .select("*")
        .eq("business_id", businessId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmployeeInvitation[];
    },
    enabled: !!businessId,
  });
};

/* ─── Create employee + send invitation ─── */
export const useInviteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      business_id: string;
      business_name: string;
      name: string;
      email: string;
      phone?: string;
      title?: string;
    }) => {
      const normalizedEmail = input.email.trim().toLowerCase();

      // 1. Insert employee row
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .insert({
          business_id: input.business_id,
          name: input.name.trim(),
          email: normalizedEmail,
          phone: input.phone?.trim() || null,
          title: input.title?.trim() || null,
        } as TablesInsert<"employees">)
        .select()
        .single();
      if (empError) throw empError;

      // 2. Generate invitation token
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const { data: invitation, error: invError } = await supabase
        .from("employee_invitations")
        .insert({
          business_id: input.business_id,
          employee_id: employee.id,
          email: normalizedEmail,
          token,
        } as TablesInsert<"employee_invitations">)
        .select()
        .single();
      if (invError) throw invError;

      // 3. Send invitation email
      const inviteUrl = `${window.location.origin}/medarbejder/accepter?token=${token}`;
      const { error: emailError } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "employee-invitation",
            recipientEmail: normalizedEmail,
            idempotencyKey: `employee-invite-${invitation.id}`,
            templateData: {
              employeeName: input.name.trim(),
              businessName: input.business_name,
              inviteUrl,
            },
          },
        }
      );
      // Don't fail the whole flow if email fails — employee + invitation already exist
      if (emailError) console.error("Failed to send invitation email", emailError);

      return { employee, invitation, emailSent: !emailError };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employees", vars.business_id] });
      qc.invalidateQueries({ queryKey: ["employee_invitations", vars.business_id] });
    },
  });
};

/* ─── Resend invitation email ─── */
export const useResendInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      invitation_id: string;
      business_id: string;
      business_name: string;
      employee_name: string;
      email: string;
    }) => {
      // Generate new token + extend expiry
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const { error: updError } = await supabase
        .from("employee_invitations")
        .update({ token, expires_at: newExpiry.toISOString() })
        .eq("id", input.invitation_id);
      if (updError) throw updError;

      const inviteUrl = `${window.location.origin}/medarbejder/accepter?token=${token}`;
      const { error: emailError } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "employee-invitation",
            recipientEmail: input.email,
            idempotencyKey: `employee-invite-resend-${input.invitation_id}-${Date.now()}`,
            templateData: {
              employeeName: input.employee_name,
              businessName: input.business_name,
              inviteUrl,
            },
          },
        }
      );
      if (emailError) throw emailError;
      return { ok: true };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employee_invitations", vars.business_id] });
    },
  });
};

/* ─── Update employee (e.g. toggle is_active, edit name/phone/title) ─── */
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

/* ─── Delete employee + invitation ─── */
export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; business_id: string }) => {
      // Delete invitations first (in case any pending exist)
      await supabase.from("employee_invitations").delete().eq("employee_id", input.id);
      const { error } = await supabase.from("employees").delete().eq("id", input.id);
      if (error) throw error;
      return { id: input.id };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employees", vars.business_id] });
      qc.invalidateQueries({ queryKey: ["employee_invitations", vars.business_id] });
    },
  });
};
