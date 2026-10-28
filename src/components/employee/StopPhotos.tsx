// Fotodokumentation på et stop: medarbejderen tager op til 3 billeder
// (fx før/efter). Gemmes privat; kun virksomheden og rutens medarbejdere ser dem.
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/route-planner/SheetSection";

const MAX = 3;

/** Skalerer billedet ned til maks 1600 px, så upload går hurtigt på mobilnet. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b || file), "image/jpeg", 0.82));
  } catch { return file; }
}

export function StopPhotos({ stopId, businessId, orderId, readOnly = false }: {
  stopId: string; businessId?: string | null; orderId?: string | null; readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const key = ["stop-photos", stopId];

  const { data: photos = [] } = useQuery({
    queryKey: key,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("stop_photos").select("id, storage_path, uploaded_by").eq("stop_id", stopId).order("created_at");
      if (error) throw error;
      if (!data?.length) return [];
      const { data: signed } = await supabase.storage.from("stop-photos").createSignedUrls(data.map((p) => p.storage_path), 3600);
      return data.map((p, i) => ({ ...p, url: signed?.[i]?.signedUrl || "" }));
    },
  });

  const upload = async (files: FileList | null) => {
    if (!files?.length || !businessId) return;
    const room = MAX - photos.length;
    if (room <= 0) { toast.error(`Højst ${MAX} billeder pr. stop`); return; }
    if (navigator.onLine === false) { toast.error("Ingen dækning", { description: "Tag billedet igen, når du har forbindelse." }); return; }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      for (const file of Array.from(files).slice(0, room)) {
        const path = `${businessId}/${stopId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("stop-photos").upload(path, await shrink(file), { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { error } = await supabase.from("stop_photos").insert({ stop_id: stopId, business_id: businessId, order_id: orderId ?? null, storage_path: path, uploaded_by: auth.user!.id });
        if (error) throw error;
      }
      toast.success("Billedet er gemt");
      qc.invalidateQueries({ queryKey: key });
    } catch {
      toast.error("Billedet blev ikke gemt", { description: "Prøv igen om lidt." });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (id: string, path: string) => {
    await supabase.storage.from("stop-photos").remove([path]);
    const { error } = await supabase.from("stop_photos").delete().eq("id", id);
    if (error) toast.error("Billedet blev ikke slettet");
    qc.invalidateQueries({ queryKey: key });
  };

  if (readOnly && photos.length === 0) return null;

  return (
    <Section icon={<Camera className="h-3.5 w-3.5" />} title="Billeder" hint={`${photos.length}/${MAX}`}>
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-md border border-border bg-secondary">
              <a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt="Billede fra stoppet" className="h-full w-full object-cover" loading="lazy" /></a>
              {!readOnly && (
                <Button size="icon" variant="secondary" aria-label="Slet billede" className="absolute right-1 top-1 h-11 w-11" onClick={() => void remove(p.id, p.storage_path)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {!readOnly && photos.length < MAX && (
        <>
          <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void upload(e.target.files)} />
          <Button variant="outline" className="h-11 w-full gap-2" disabled={busy || !businessId} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {photos.length ? "Tag et billede mere" : "Tag billede (før/efter)"}
          </Button>
        </>
      )}
    </Section>
  );
}
