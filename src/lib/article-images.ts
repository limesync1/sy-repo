import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ArticleImage { path: string; image_url: string; alt: string | null }

/** All finished article cover images, keyed by page path. One cached request for every article/list. */
export function useArticleImages() {
  return useQuery({
    queryKey: ["article-images"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("article_images").select("path,image_url,alt").eq("status", "done").limit(2000);
      if (error) throw error;
      return new Map((data ?? []).filter((r) => r.image_url).map((r) => [r.path, r as ArticleImage]));
    },
  });
}

export function useArticleImage(path: string) {
  return useArticleImages().data?.get(path);
}
