import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useFavoriteIds = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", "ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("business_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.business_id));
    },
    staleTime: 1000 * 60,
  });
};

export const useMyFavorites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", "list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, created_at, business_id, businesses (id, name, slug, city, logo_url, cover_image_url, is_verified, category, categories)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useToggleFavorite = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, isFavorited }: { businessId: string; isFavorited: boolean }) => {
      if (!user) throw new Error("Du skal være logget ind");
      if (isFavorited) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("business_id", businessId);
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, business_id: businessId });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: ({ added }) => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(added ? "Tilføjet til favoritter" : "Fjernet fra favoritter");
    },
    onError: (e: any) => toast.error(e.message ?? "Kunne ikke opdatere favorit"),
  });
};
