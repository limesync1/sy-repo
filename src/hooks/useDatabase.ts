import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Business = Tables<"businesses">;
export type Service = Tables<"services">;
export type CalculatorStep = Tables<"calculator_steps">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type Review = Tables<"reviews">;

// Fetch business by slug (public)
export const useBusinessBySlug = (slug: string) => {
  return useQuery({
    queryKey: ["business", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};

// Fetch current user's business
export const useMyBusiness = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-business", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// Fetch services for a business (with calculator steps)
export const useServices = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["services", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, calculator_steps(*)")
        .eq("business_id", businessId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
};

// Fetch orders for a business
export const useOrders = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["orders", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
};

// Fetch reviews for a business
export const useReviews = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["reviews", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
};

// Create business
export const useCreateBusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (biz: TablesInsert<"businesses">) => {
      const { data, error } = await supabase.from("businesses").insert(biz).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-business"] }),
  });
};

// Update business
export const useUpdateBusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"businesses"> & { id: string }) => {
      const { data, error } = await supabase.from("businesses").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-business"] }),
  });
};

// Create service
export const useCreateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (service: TablesInsert<"services">) => {
      const { data, error } = await supabase.from("services").insert(service).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["services", vars.business_id] }),
  });
};

// Update service
export const useUpdateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"services"> & { id: string }) => {
      const { data, error } = await supabase.from("services").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
};

// Delete service
export const useDeleteService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
};

// Manage calculator steps
export const useUpsertCalculatorSteps = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, steps }: { serviceId: string; steps: TablesInsert<"calculator_steps">[] }) => {
      // Delete existing steps
      await supabase.from("calculator_steps").delete().eq("service_id", serviceId);
      // Insert new ones
      if (steps.length > 0) {
        const { error } = await supabase.from("calculator_steps").insert(steps);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
};

// Create order (public)
export const useCreateOrder = () => {
  return useMutation({
    mutationFn: async ({
      order,
      items,
    }: {
      order: TablesInsert<"orders">;
      items: Omit<TablesInsert<"order_items">, "order_id">[];
    }) => {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert(order)
        .select()
        .single();
      if (orderError) throw orderError;

      if (items.length > 0) {
        const orderItems = items.map((item) => ({ ...item, order_id: orderData.id }));
        const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
        if (itemsError) throw itemsError;
      }

      return orderData;
    },
  });
};

// Update order status
export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
};
