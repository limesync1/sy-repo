import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard, PrimaryButton } from "@/components/admin/shared/AdminUI";
import { CORE_STEPS } from "@/components/admin/onboarding/steps";
import { useOnboardingVideos } from "@/hooks/useOnboardingVideos";

/** Platform-admin: ét video-link pr. trin i virksomhedernes "Kom godt i gang". */
export default function OnboardingVideosSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useOnboardingVideos();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setValues(data); }, [data]);

  const save = async () => {
    for (const [id, v] of Object.entries(values)) {
      if (v.trim() && !/^(https?:\/\/|\/)/.test(v.trim())) {
        toast.error("Ugyldigt link", { description: `Linket til "${CORE_STEPS.find((s) => s.id === id)?.title}" skal starte med https:// eller /` });
        return;
      }
    }
    setSaving(true);
    const rows = CORE_STEPS.map((s) => ({
      step_id: s.id,
      video_url: values[s.id]?.trim() || null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await (supabase as any).from("onboarding_videos").upsert(rows, { onConflict: "step_id" });
    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme videoerne", { description: error.message }); return; }
    qc.invalidateQueries({ queryKey: ["onboarding-videos"] });
    toast.success("Videoerne er gemt");
  };

  return (
    <SectionCard
      title="Videoer i “Kom godt i gang”"
      icon={<PlayCircle />}
      description="Indsæt et link for hvert trin — YouTube, Vimeo eller en direkte videofil (.mp4). Tomt felt viser “Video kommer snart”."
    >
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {CORE_STEPS.map((s, i) => (
            <div key={s.id} className="space-y-1.5">
              <Label htmlFor={`ov-${s.id}`} className="text-xs font-semibold">Trin {i + 1}: {s.title}</Label>
              <Input
                id={`ov-${s.id}`}
                value={values[s.id] ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, [s.id]: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=…"
                className="h-9"
              />
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <PrimaryButton onClick={save} disabled={saving} icon={saving ? <Loader2 className="animate-spin" /> : <PlayCircle />}>
              Gem videoer
            </PrimaryButton>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
