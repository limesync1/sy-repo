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
export type Subscription = Tables<"subscriptions">;
export type Profile = Tables<"profiles">;

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

// Fetch all active businesses with rich filtering, search and sorting (public)
export type SortOption = "relevance" | "newest" | "rating" | "name";

export const useAllBusinesses = (
  category?: string,
  search?: string,
  sort: SortOption = "relevance",
) => {
  return useQuery({
    queryKey: ["businesses", category, search, sort],
    queryFn: async () => {
      // Pull businesses with their services + reviews in one go so we can:
      //  - search across name/description/city/zip/address/categories AND service names
      //  - rank by rating / relevance client-side
      let query = supabase
        .from("businesses")
        .select("*, services(name, subcategory, service_category), reviews(rating)")
        .eq("is_active", true);

      if (category) query = query.contains("categories", [category]);

      const { data, error } = await query;
      if (error) throw error;
      let rows = (data || []) as any[];

      // Multi-token search across many fields, including service names
      const tokens = (search || "")
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      if (tokens.length > 0) {
        rows = rows
          .map((b) => {
            const haystackParts = [
              b.name,
              b.description,
              b.city,
              b.zip_code,
              b.address,
              ...(Array.isArray(b.categories) ? b.categories : []),
              b.category,
              ...((b.services || []).flatMap((s: any) => [s.name, s.subcategory, s.service_category])),
            ]
              .filter(Boolean)
              .map((s: string) => String(s).toLowerCase());
            const haystack = haystackParts.join(" \u0001 ");

            // Every token must match somewhere (AND semantics)
            const allMatch = tokens.every((t) => haystack.includes(t));
            if (!allMatch) return null;

            // Score: name match > city match > description/services
            let score = 0;
            for (const t of tokens) {
              if (b.name?.toLowerCase().includes(t)) score += 10;
              if (b.city?.toLowerCase().includes(t)) score += 6;
              if (b.zip_code?.toLowerCase?.().includes(t)) score += 6;
              if ((b.categories || []).some((c: string) => c.toLowerCase().includes(t))) score += 5;
              if ((b.services || []).some((s: any) => s.name?.toLowerCase().includes(t))) score += 4;
              if (b.description?.toLowerCase().includes(t)) score += 1;
            }
            return { ...b, _score: score };
          })
          .filter(Boolean) as any[];
      }

      // Compute aggregated rating once
      rows = rows.map((b) => {
        const reviews = b.reviews || [];
        const avg = reviews.length
          ? reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length
          : 0;
        return { ...b, _avgRating: avg, _reviewCount: reviews.length };
      });

      // Sorting
      if (sort === "rating") {
        rows.sort((a, b) => b._avgRating - a._avgRating || b._reviewCount - a._reviewCount);
      } else if (sort === "newest") {
        rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      } else if (sort === "name") {
        rows.sort((a, b) => a.name.localeCompare(b.name, "da"));
      } else {
        // relevance: verified first, then score (if searching), then rating, then newest
        rows.sort((a, b) => {
          if (!!b.is_verified !== !!a.is_verified) return b.is_verified ? 1 : -1;
          if ((b._score || 0) !== (a._score || 0)) return (b._score || 0) - (a._score || 0);
          if (b._avgRating !== a._avgRating) return b._avgRating - a._avgRating;
          return +new Date(b.created_at) - +new Date(a.created_at);
        });
      }

      return rows;
    },
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
      await supabase.from("calculator_steps").delete().eq("service_id", serviceId);
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

// Create review (public)
export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (review: TablesInsert<"reviews">) => {
      const { data, error } = await supabase.from("reviews").insert(review).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["reviews", data.business_id] }),
  });
};

// Create quote request (public)
export const useCreateQuoteRequest = () => {
  return useMutation({
    mutationFn: async (req: TablesInsert<"quote_requests">) => {
      const { data, error } = await supabase.from("quote_requests").insert(req).select().single();
      if (error) throw error;
      return data;
    },
  });
};

// Fetch quote requests (for businesses in matching categories)
export const useQuoteRequests = (categories?: string[] | null) => {
  return useQuery({
    queryKey: ["quote-requests", categories],
    queryFn: async () => {
      let query = supabase
        .from("quote_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (categories && categories.length > 0) {
        query = query.in("category", categories);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!categories && categories.length > 0,
  });
};

// Create quote (business owner)
export const useCreateQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quote: TablesInsert<"quotes">) => {
      const { data, error } = await supabase.from("quotes").insert(quote).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-requests"] }),
  });
};

// Fetch quotes for a business
export const useMyQuotes = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["my-quotes", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, quote_requests(*)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
};

// ── Customer Orders ──
export const useMyOrders = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), businesses(name, slug, logo_url)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// ── Subscriptions ──

// Customer: fetch my subscriptions
export const useMySubscriptions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-subscriptions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, businesses(name, slug, logo_url), services(name, pricing_type)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// Business: fetch subscriptions for my business
export const useBusinessSubscriptions = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["business-subscriptions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
};

// Create subscription
export const useCreateSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sub: TablesInsert<"subscriptions">) => {
      const { data, error } = await supabase.from("subscriptions").insert(sub).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["business-subscriptions"] });
    },
  });
};

// Update subscription (pause/cancel/resume)
export const useUpdateSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesUpdate<"subscriptions">>) => {
      const { data, error } = await supabase.from("subscriptions").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["business-subscriptions"] });
    },
  });
};

// Fetch my profile
export const useMyProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// Update my profile
export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...updates }: { userId: string } & Partial<TablesUpdate<"profiles">>) => {
      const { data, error } = await supabase.from("profiles").update(updates as any).eq("user_id", userId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-profile"] }),
  });
};
