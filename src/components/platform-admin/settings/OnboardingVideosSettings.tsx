import { FormSkeleton } from "@/components/admin/shared/Skeletons";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard, PrimaryButton } from "@/components/admin/shared/AdminUI";
import { FULL_CORE_STEPS, FULL_NEXT_STEPS, LISTING_CORE_STEPS, LISTING_NEXT_STEPS } from "@/components/admin/onboarding/steps";

type VideoField = { id: string; label: string };
const fieldsFor = (intro: string, steps: { id: string; title: string }[]): VideoField[] => [
  { id: intro, label: "Introvideo" },
  ...steps.map((s, i) => ({ id: s.id, label: `Trin ${i + 1}: ${s.title}` })),
];
const TRACKS = [
  { key: "full", label: "Fuldt system", fields: fieldsFor("intro_full", [...FULL_CORE_STEPS, ...FULL_NEXT_STEPS]) },
  { key: "listing", label: "Kun profil", fields: fieldsFor("intro_listing", [...LISTING_CORE_STEPS, ...LISTING_NEXT_STEPS]) },
];
const ALL_FIELDS = Array.from(new Map(TRACKS.flatMap((t) => t.fields).map((f) => [f.id, f])).values());
import { useOnboardingVideos } from "@/hooks/useOnboardingVideos";

/** Platform-admin: ét video-link pr. trin i virksomhedernes "Kom godt i gang". */
export default function OnboardingVideosSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useOnboardingVideos();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [track, setTrack] = useState("full");

  useEffect(() => { if (data) setValues(data); }, [data]);

  const save = async () => {
    for (const [id, v] of Object.entries(values)) {
      if (v.trim() && !/^(https?:\/\/|\/)/.test(v.trim())) {
        toast.error("Ugyldigt link", { description: `Linket til "${ALL_FIELDS.find((f) => f.id === id)?.label}" skal starte med https:// eller /` });
        return;
      }
    }
    setSaving(true);
    const rows = ALL_FIELDS.map((s) => ({
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
        <div role="status" aria-label="Indlæser"><FormSkeleton fields={3} /></div>
      ) : (
        <div className="space-y-3">
          <div role="tablist" className="flex gap-2">
            {TRACKS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={track === t.key} onClick={() => setTrack(t.key)}
                className={`min-h-11 rounded-md border px-3 text-sm font-semibold ${track === t.key ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Brancher, profil og services deler video mellem de to guider.</p>
          {TRACKS.find((t) => t.key === track)!.fields.map((s) => (
            <div key={s.id} className="space-y-1.5">
              <Label htmlFor={`ov-${s.id}`} className="text-xs font-semibold">{s.label}</Label>
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
