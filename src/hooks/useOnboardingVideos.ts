import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Video-links pr. "Kom godt i gang"-trin. Styres af platform-admin. */
export const useOnboardingVideos = () =>
  useQuery({
    queryKey: ["onboarding-videos"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("onboarding_videos")
        .select("step_id, video_url");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of (data ?? []) as { step_id: string; video_url: string | null }[]) {
        if (r.video_url?.trim()) map[r.step_id] = r.video_url.trim();
      }
      return map;
    },
  });

/** Laver YouTube/Vimeo-links om til indlejrbare adresser. Ellers null (= almindelig videofil). */
export const toEmbedUrl = (url: string): string | null => {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
};
