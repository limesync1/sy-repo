// Billedbevis på et stop: frivillige før/efter-billeder (op til 3 af hver).
// Gemmes privat; kun virksomheden og rutens medarbejdere kan se dem.
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Section } from "@/components/route-planner/SheetSection";
import { cn } from "@/lib/utils";
import { MAX_PER_PHASE, PHASE_LABEL, suggestPhase, type PhotoPhase } from "@/lib/stop-photo-phase";

export type StopPhoto = { id: string; stop_id: string; order_id: string | null; storage_path: string; phase: PhotoPhase; created_at: string; url: string };

/** Henter billeder for ét stop eller for en aftale (alle kørsler). */
export function useStopPhotos(filter: { stopId?: string; orderId?: string | null }) {
  const col = filter.stopId ? "stop_id" : "order_id";
  const val = filter.stopId || filter.orderId;
  return useQuery({
    queryKey: ["stop-photos", col, val],
    enabled: !!val,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<StopPhoto[]> => {
      const { data, error } = await supabase.from("stop_photos")
        .select("id, stop_id, order_id, storage_path, phase, created_at").eq(col, val!).order("created_at");
      if (error) throw error;
      if (!data?.length) return [];
      const { data: signed } = await supabase.storage.from("stop-photos").createSignedUrls(data.map((p) => p.storage_path), 3600);
      return data.map((p, i) => ({ ...(p as any), url: signed?.[i]?.signedUrl || "" }));
    },
  });
}

/** Skalerer ned til maks 1600 px, så upload går hurtigt på mobilnet. */
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

/** Fælles upload-logik med skjult kamera-input. */
function usePhotoUpload(stopId: string, businessId?: string | null, orderId?: string | null) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const phaseRef = useRef<PhotoPhase>("before");
  const [busy, setBusy] = useState<PhotoPhase | null>(null);

  const open = (phase: PhotoPhase) => { phaseRef.current = phase; input.current?.click(); };
  const onFiles = async (files: FileList | null, room: number) => {
    const phase = phaseRef.current;
    if (!files?.length || !businessId) return;
    if (room <= 0) { toast.error(`Højst ${MAX_PER_PHASE} ${PHASE_LABEL[phase].toLowerCase()}-billeder`); return; }
    if (navigator.onLine === false) { toast.error("Ingen dækning", { description: "Tag billedet igen, når du har forbindelse." }); return; }
    setBusy(phase);
    try {
      const { data: auth } = await supabase.auth.getUser();
      for (const file of Array.from(files).slice(0, room)) {
        const path = `${businessId}/${stopId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("stop-photos").upload(path, await shrink(file), { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { error } = await supabase.from("stop_photos").insert({ stop_id: stopId, business_id: businessId, order_id: orderId ?? null, storage_path: path, phase, uploaded_by: auth.user!.id });
        if (error) throw error;
      }
      toast.success(`${PHASE_LABEL[phase]}-billede gemt`);
      qc.invalidateQueries({ queryKey: ["stop-photos"] });
    } catch {
      toast.error("Billedet blev ikke gemt", { description: "Prøv igen om lidt." });
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };
  return { input, open, onFiles, busy, phaseRef };
}

function Lightbox({ photo, onClose }: { photo: StopPhoto | null; onClose: () => void }) {
  return (
    <Dialog open={!!photo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl gap-2 p-2 sm:p-3">
        <DialogTitle className="sr-only">Billede</DialogTitle>
        <DialogDescription className="px-1 text-sm">
          {photo && `${PHASE_LABEL[photo.phase]} · ${format(new Date(photo.created_at), "d. MMM yyyy 'kl.' HH:mm", { locale: da })}`}
        </DialogDescription>
        {photo && <img src={photo.url} alt={`${PHASE_LABEL[photo.phase]}-billede`} className="max-h-[78dvh] w-full rounded-md object-contain bg-secondary" />}
      </DialogContent>
    </Dialog>
  );
}

function Thumb({ p, onOpen, onDelete }: { p: StopPhoto; onOpen: () => void; onDelete?: () => void }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-secondary">
      <button type="button" onClick={onOpen} className="block h-full w-full" aria-label={`Åbn ${PHASE_LABEL[p.phase]}-billede`}>
        <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      </button>
      {onDelete && (
        <Button size="icon" variant="secondary" aria-label="Slet billede" className="absolute right-1 top-1 h-11 w-11 opacity-90" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/** Før/efter-kolonner. Bruges både i medarbejderens stop og i virksomhedspanelet. */
function PhaseColumns({ photos, editable, busy, onAdd, onOpen, onDelete }: {
  photos: StopPhoto[]; editable: boolean; busy: PhotoPhase | null;
  onAdd?: (p: PhotoPhase) => void; onOpen: (p: StopPhoto) => void; onDelete?: (p: StopPhoto) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["before", "after"] as PhotoPhase[]).map((phase) => {
        const list = photos.filter((p) => p.phase === phase);
        if (!editable && list.length === 0) return (
          <div key={phase}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{PHASE_LABEL[phase]}</p>
            <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Intet billede</p>
          </div>
        );
        return (
          <div key={phase} className="min-w-0">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{PHASE_LABEL[phase]} {list.length > 0 && <span className="font-normal">· {list.length}</span>}</p>
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
              {list.map((p) => <Thumb key={p.id} p={p} onOpen={() => onOpen(p)} onDelete={onDelete ? () => onDelete(p) : undefined} />)}
              {editable && list.length < MAX_PER_PHASE && (
                <button type="button" onClick={() => onAdd?.(phase)} disabled={!!busy}
                  className="flex aspect-square min-h-11 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-card text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-secondary disabled:opacity-60">
                  {busy === phase ? <Loader2 className="h-5 w-5 animate-spin" /> : list.length ? <ImagePlus className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                  <span>{list.length ? "Tilføj" : `Tag ${PHASE_LABEL[phase].toLowerCase()}`}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function deletePhoto(p: StopPhoto) {
  await supabase.storage.from("stop-photos").remove([p.storage_path]);
  const { error } = await supabase.from("stop_photos").delete().eq("id", p.id);
  if (error) throw error;
}

/** Medarbejderens billedsektion på et stop. */
export function StopPhotos({ stopId, businessId, orderId, readOnly = false }: {
  stopId: string; businessId?: string | null; orderId?: string | null; readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const { data: photos = [] } = useStopPhotos({ stopId });
  const up = usePhotoUpload(stopId, businessId, orderId);
  const [open, setOpen] = useState<StopPhoto | null>(null);
  if (readOnly && photos.length === 0) return null;
  const room = (ph: PhotoPhase) => MAX_PER_PHASE - photos.filter((p) => p.phase === ph).length;

  return (
    <Section icon={<Camera className="h-3.5 w-3.5" />} title="Billedbevis" hint={readOnly ? `${photos.length}` : "Frivilligt"}>
      <input ref={up.input} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => void up.onFiles(e.target.files, room(up.phaseRef.current))} />
      <PhaseColumns photos={photos} editable={!readOnly && !!businessId} busy={up.busy} onAdd={up.open} onOpen={setOpen}
        onDelete={readOnly ? undefined : async (p) => {
          try { await deletePhoto(p); } catch { toast.error("Billedet blev ikke slettet"); }
          qc.invalidateQueries({ queryKey: ["stop-photos"] });
        }} />
      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </Section>
  );
}

/** Kamera-flise til kørselspanelet: ét tryk → vælg Før/Efter (forslag fremhævet) → kamera. */
export function StopCameraTile({ stopId, businessId, orderId, completed }: {
  stopId: string; businessId?: string | null; orderId?: string | null; completed: boolean;
}) {
  const { data: photos = [] } = useStopPhotos({ stopId });
  const up = usePhotoUpload(stopId, businessId, orderId);
  const [sheet, setSheet] = useState(false);
  const suggested = suggestPhase(photos, completed);
  const count = photos.length;
  const room = (ph: PhotoPhase) => MAX_PER_PHASE - photos.filter((p) => p.phase === ph).length;
  const pick = (ph: PhotoPhase) => { setSheet(false); window.setTimeout(() => up.open(ph), 50); };

  return (
    <>
      <input ref={up.input} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => void up.onFiles(e.target.files, room(up.phaseRef.current))} />
      <Button variant="outline" aria-label="Tag billede" title="Tag billede" className="route-dock-tile relative" disabled={!businessId || !!up.busy} onClick={() => setSheet(true)}>
        {up.busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <Camera className="h-5 w-5 shrink-0" />}
        <span className="route-dock-tile-label">Foto</span>
        {count > 0 && <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">{count}</span>}
      </Button>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="rounded-t-md p-0">
          <SheetHeader className="border-b border-border p-5 pr-14 text-left">
            <SheetTitle>Billedbevis</SheetTitle>
            <SheetDescription>Frivilligt. Vælg om billedet er før eller efter arbejdet.</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {(["before", "after"] as PhotoPhase[]).map((ph) => {
              const n = photos.filter((p) => p.phase === ph).length;
              return (
                <Button key={ph} variant={ph === suggested ? "default" : "outline"} disabled={room(ph) <= 0}
                  className={cn("flex h-28 flex-col gap-1.5 text-base font-semibold")} onClick={() => pick(ph)}>
                  <Camera className="h-6 w-6" />
                  {PHASE_LABEL[ph]}
                  <span className="text-xs font-normal opacity-80">{room(ph) <= 0 ? "Fuld" : n ? `${n} taget` : ph === suggested ? "Foreslået" : "Intet endnu"}</span>
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Virksomhedspanelet: billeder for en aftale, grupperet pr. kørsel (stop). */
export function OrderPhotoGallery({ orderId }: { orderId: string }) {
  const { data: photos = [], isLoading } = useStopPhotos({ orderId });
  const [open, setOpen] = useState<StopPhoto | null>(null);
  if (isLoading || photos.length === 0) return null;
  const runs = new Map<string, StopPhoto[]>();
  photos.forEach((p) => runs.set(p.stop_id, [...(runs.get(p.stop_id) || []), p]));
  const groups = [...runs.values()].sort((a, b) => b[0].created_at.localeCompare(a[0].created_at));

  return (
    <Section icon={<Camera className="h-3.5 w-3.5" />} title="Billedbevis" hint={`${photos.length} ${photos.length === 1 ? "billede" : "billeder"}`}>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g[0].stop_id}>
            {groups.length > 1 && <p className="mb-2 text-sm font-medium text-foreground">Kørsel {format(new Date(g[0].created_at), "d. MMM yyyy", { locale: da })}</p>}
            <PhaseColumns photos={g} editable={false} busy={null} onOpen={setOpen} />
          </div>
        ))}
      </div>
      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </Section>
  );
}
