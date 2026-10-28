// Billedbevis på et stop: frivillige før/efter-billeder (op til 3 af hver).
// Gemmes privat; kun virksomheden og rutens medarbejdere kan se dem.
// Hvert billede gemmes i to størrelser: et lille miniaturebillede til lister
// (hurtig visning) og et komprimeret fuldt billede til forstørrelse.
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImageOff, ImagePlus, Loader2, Trash2 } from "lucide-react";
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
import { photoErrorMessage, thumbPathFor, validatePhotoFile } from "@/lib/stop-photo-upload";

export type StopPhoto = {
  id: string; stop_id: string; order_id: string | null; storage_path: string; phase: PhotoPhase;
  created_at: string; url: string; thumbUrl: string;
};

const BUCKET = "stop-photos";

/** Henter billeder for ét stop eller for en aftale (alle kørsler). */
export function useStopPhotos(filter: { stopId?: string; orderId?: string | null }) {
  const col = filter.stopId ? "stop_id" : "order_id";
  const val = filter.stopId || filter.orderId;
  return useQuery({
    queryKey: ["stop-photos", col, val],
    enabled: !!val,
    staleTime: 30 * 60_000,
    retry: 1,
    queryFn: async (): Promise<StopPhoto[]> => {
      const { data, error } = await supabase.from("stop_photos")
        .select("id, stop_id, order_id, storage_path, phase, created_at").eq(col, val!).order("created_at");
      if (error) throw error;
      if (!data?.length) return [];
      const paths = data.flatMap((p) => [p.storage_path, thumbPathFor(p.storage_path)]);
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      const byPath = new Map((signed || []).map((s) => [s.path, s.error ? "" : s.signedUrl]));
      return data.map((p) => {
        const url = byPath.get(p.storage_path) || "";
        return { ...(p as any), url, thumbUrl: byPath.get(thumbPathFor(p.storage_path)) || url };
      });
    },
  });
}

/** Finder virksomheden via ruten, når aftalen ikke er indlæst. */
function useStopBusinessId(stopId: string, known?: string | null) {
  const { data } = useQuery({
    queryKey: ["stop-business-id", stopId],
    enabled: !known && !!stopId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase.from("route_stops").select("routes(business_id)").eq("id", stopId).maybeSingle();
      return ((data as any)?.routes?.business_id as string | undefined) ?? null;
    },
  });
  return known || data || null;
}

/** Skalerer og komprimerer til JPEG. */
async function compress(file: File, maxSide: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("compress"))), "image/jpeg", quality));
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
    const label = PHASE_LABEL[phase].toLowerCase();
    if (!files?.length) return;
    if (!businessId) { toast.error("Billedet kan ikke gemmes endnu", { description: "Aftalen indlæses stadig. Prøv igen om et øjeblik." }); return; }
    if (room <= 0) { toast.error(`Der er allerede ${MAX_PER_PHASE} ${label}-billeder`, { description: "Slet et billede for at tage et nyt." }); return; }
    if (navigator.onLine === false) { toast.error("Ingen dækning", { description: "Billeder kræver internet. Tag billedet igen, når du har forbindelse." }); return; }
    const list = Array.from(files).slice(0, room);
    const invalid = list.map(validatePhotoFile).find(Boolean);
    if (invalid) { toast.error(invalid); return; }
    setBusy(phase);
    let saved = 0;
    let lastError: unknown = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("not authenticated");
      for (const file of list) {
        const path = `${businessId}/${stopId}/${crypto.randomUUID()}.jpg`;
        try {
          const [full, thumb] = await Promise.all([compress(file, 1280, 0.72), compress(file, 360, 0.6)]);
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, full, { contentType: "image/jpeg", cacheControl: "31536000" });
          if (upErr) throw upErr;
          // Miniaturen er en hastighedsforbedring; mislykkes den, bruges det fulde billede.
          await supabase.storage.from(BUCKET).upload(thumbPathFor(path), thumb, { contentType: "image/jpeg", cacheControl: "31536000" });
          const { error } = await supabase.from("stop_photos").insert({ stop_id: stopId, business_id: businessId, order_id: orderId ?? null, storage_path: path, phase, uploaded_by: auth.user.id });
          if (error) {
            await supabase.storage.from(BUCKET).remove([path, thumbPathFor(path)]);
            throw error;
          }
          saved++;
        } catch (e) { lastError = e; }
      }
    } catch (e) { lastError = e; }
    finally {
      setBusy(null);
      if (input.current) input.current.value = "";
      qc.invalidateQueries({ queryKey: ["stop-photos"] });
    }
    if (saved > 0 && !lastError) toast.success(saved > 1 ? `${saved} ${label}-billeder gemt` : `${PHASE_LABEL[phase]}-billede gemt`);
    else if (saved > 0) toast.warning(`${saved} af ${list.length} billeder blev gemt`, { description: photoErrorMessage(lastError) });
    else toast.error("Billedet blev ikke gemt", {
      description: photoErrorMessage(lastError),
      action: { label: "Prøv igen", onClick: () => open(phase) },
    });
  };
  return { input, open, onFiles, busy, phaseRef };
}

function Lightbox({ photo, onClose }: { photo: StopPhoto | null; onClose: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <Dialog open={!!photo} onOpenChange={(o) => { if (!o) { onClose(); setFailed(false); } }}>
      <DialogContent className="max-w-3xl gap-2 p-2 sm:p-3">
        <DialogTitle className="sr-only">Billede</DialogTitle>
        <DialogDescription className="flex items-center gap-2 px-1 pr-12 text-sm">
          {photo && <><PhaseBadge phase={photo.phase} />{format(new Date(photo.created_at), "d. MMM yyyy 'kl.' HH:mm", { locale: da })}</>}
        </DialogDescription>
        {photo && (failed || !photo.url ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-md bg-secondary text-sm text-muted-foreground">
            <ImageOff className="h-6 w-6" />Billedet kunne ikke hentes. Luk og prøv igen.
          </div>
        ) : (
          <img src={photo.url} alt={`${PHASE_LABEL[photo.phase]}-billede`} onError={() => setFailed(true)}
            style={{ backgroundImage: `url(${photo.thumbUrl})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }}
            className="max-h-[78dvh] w-full rounded-md bg-secondary object-contain" />
        ))}
      </DialogContent>
    </Dialog>
  );
}

/** Tydelig mærkat: mørk baggrund og farvet prik, læsbar i lyst og mørkt tema. */
function PhaseBadge({ phase }: { phase: PhotoPhase }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-bold text-background">
      <span className={cn("h-2 w-2 rounded-full", phase === "before" ? "bg-warning" : "bg-success")} aria-hidden />
      {PHASE_LABEL[phase]}
    </span>
  );
}

function Thumb({ p, onOpen, onDelete }: { p: StopPhoto; onOpen: () => void; onDelete?: () => void }) {
  const [src, setSrc] = useState(p.thumbUrl || p.url);
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-secondary">
      <button type="button" onClick={onOpen} className="block h-full w-full" aria-label={`Åbn ${PHASE_LABEL[p.phase]}-billede`}>
        {broken ? (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground"><ImageOff className="h-5 w-5" /></span>
        ) : (
          <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"
            onError={() => (src !== p.url && p.url ? setSrc(p.url) : setBroken(true))} />
        )}
      </button>
      {onDelete && (
        <Button size="icon" variant="secondary" aria-label="Slet billede" className="absolute right-1 top-1 h-11 w-11 bg-background/90 shadow-sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/** Før/efter som to tydelige kort. Bruges både i medarbejderens stop og i virksomhedspanelet. */
function PhaseColumns({ photos, editable, busy, onAdd, onOpen, onDelete }: {
  photos: StopPhoto[]; editable: boolean; busy: PhotoPhase | null;
  onAdd?: (p: PhotoPhase) => void; onOpen: (p: StopPhoto) => void; onDelete?: (p: StopPhoto) => void;
}) {
  return (
    <div className="grid gap-3 min-[420px]:grid-cols-2">
      {(["before", "after"] as PhotoPhase[]).map((phase) => {
        const list = photos.filter((p) => p.phase === phase);
        const canAdd = editable && list.length < MAX_PER_PHASE;
        return (
          <div key={phase} className="min-w-0 rounded-lg border border-border bg-card p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <PhaseBadge phase={phase} />
              <span className="text-xs text-muted-foreground">{list.length}/{MAX_PER_PHASE}</span>
            </div>
            {list.length === 0 && !canAdd ? (
              <p className="rounded-md bg-secondary px-3 py-4 text-center text-sm text-muted-foreground">Intet billede</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {list.map((p) => <Thumb key={p.id} p={p} onOpen={() => onOpen(p)} onDelete={onDelete ? () => onDelete(p) : undefined} />)}
                {canAdd && (
                  <button type="button" onClick={() => onAdd?.(phase)} disabled={!!busy}
                    aria-label={`Tag ${PHASE_LABEL[phase].toLowerCase()}-billede`}
                    className={cn("flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-background text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-secondary disabled:opacity-60",
                      list.length === 0 ? "col-span-3 py-4" : "aspect-square")}>
                    {busy === phase ? <Loader2 className="h-5 w-5 animate-spin" /> : list.length ? <ImagePlus className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                    <span>{busy === phase ? "Gemmer…" : list.length ? "Tilføj" : `Tag ${PHASE_LABEL[phase].toLowerCase()}-billede`}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

async function deletePhoto(p: StopPhoto) {
  const { error } = await supabase.from("stop_photos").delete().eq("id", p.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([p.storage_path, thumbPathFor(p.storage_path)]);
}

function useDelete() {
  const qc = useQueryClient();
  return async (p: StopPhoto) => {
    if (!window.confirm(`Slet ${PHASE_LABEL[p.phase].toLowerCase()}-billedet?`)) return;
    try { await deletePhoto(p); toast.success("Billedet er slettet"); }
    catch (e) { toast.error("Billedet blev ikke slettet", { description: photoErrorMessage(e) }); }
    qc.invalidateQueries({ queryKey: ["stop-photos"] });
  };
}

/** Medarbejderens billedsektion på et stop. Skrivebeskyttet viser også tidligere kørsler af aftalen. */
export function StopPhotos({ stopId, businessId, orderId, readOnly = false }: {
  stopId: string; businessId?: string | null; orderId?: string | null; readOnly?: boolean;
}) {
  const bizId = useStopBusinessId(stopId, businessId);
  const { data: photos = [], isError, refetch } = useStopPhotos({ stopId });
  const up = usePhotoUpload(stopId, bizId, orderId);
  const remove = useDelete();
  const [open, setOpen] = useState<StopPhoto | null>(null);
  if (readOnly && photos.length === 0 && !isError) return null;
  const room = (ph: PhotoPhase) => MAX_PER_PHASE - photos.filter((p) => p.phase === ph).length;

  return (
    <Section icon={<Camera className="h-3.5 w-3.5" />} title="Billedbevis" hint={readOnly ? `${photos.length}` : "Frivilligt"}>
      <input ref={up.input} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => void up.onFiles(e.target.files, room(up.phaseRef.current))} />
      {isError ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary p-3 text-sm text-muted-foreground">
          Billederne kunne ikke hentes.
          <Button variant="outline" size="sm" className="h-11" onClick={() => void refetch()}>Prøv igen</Button>
        </div>
      ) : (
        <PhaseColumns photos={photos} editable={!readOnly && !!bizId} busy={up.busy} onAdd={up.open} onOpen={setOpen}
          onDelete={readOnly ? undefined : remove} />
      )}
      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </Section>
  );
}

/** Kamera-knap: ét tryk → vælg Før/Efter (forslag fremhævet) → kamera.
 *  `dock` bruges i kørselspanelet, `button` i tjeklisten. */
export function StopCameraTile({ stopId, businessId, orderId, completed, variant = "dock", className }: {
  stopId: string; businessId?: string | null; orderId?: string | null; completed: boolean;
  variant?: "dock" | "button"; className?: string;
}) {
  const bizId = useStopBusinessId(stopId, businessId);
  const { data: photos = [] } = useStopPhotos({ stopId });
  const up = usePhotoUpload(stopId, bizId, orderId);
  const [sheet, setSheet] = useState(false);
  const suggested = suggestPhase(photos, completed);
  const count = photos.length;
  const room = (ph: PhotoPhase) => MAX_PER_PHASE - photos.filter((p) => p.phase === ph).length;
  const pick = (ph: PhotoPhase) => { setSheet(false); window.setTimeout(() => up.open(ph), 50); };
  const icon = up.busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <Camera className="h-5 w-5 shrink-0" />;
  const badge = count > 0 && <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">{count}</span>;

  return (
    <>
      <input ref={up.input} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => void up.onFiles(e.target.files, room(up.phaseRef.current))} />
      {variant === "dock" ? (
        <Button variant="outline" aria-label="Tag billede" title="Tag billede" className={cn("route-dock-tile relative", className)} disabled={!!up.busy} onClick={() => setSheet(true)}>
          {icon}<span className="route-dock-tile-label">Foto</span>{badge}
        </Button>
      ) : (
        <Button variant="outline" className={cn("relative h-11 gap-2", className)} disabled={!!up.busy} onClick={() => setSheet(true)}>
          {icon}{up.busy ? "Gemmer billede…" : count ? `Billeder (${count})` : "Tag billede"}
        </Button>
      )}
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="rounded-t-md p-0">
          <SheetHeader className="border-b border-border p-5 pr-14 text-left">
            <SheetTitle>Billedbevis</SheetTitle>
            <SheetDescription>Frivilligt. Tag et billede før du går i gang, og et efter du er færdig.</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {(["before", "after"] as PhotoPhase[]).map((ph) => {
              const n = photos.filter((p) => p.phase === ph).length;
              const full = room(ph) <= 0;
              return (
                <button key={ph} type="button" disabled={full} onClick={() => pick(ph)}
                  className={cn("relative flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 text-center transition-colors disabled:opacity-50",
                    ph === suggested && !full ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary")}>
                  {ph === suggested && !full && <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Foreslået</span>}
                  <Camera className="h-7 w-7 text-foreground" />
                  <PhaseBadge phase={ph} />
                  <span className="text-xs text-muted-foreground">{full ? `Fuld (${MAX_PER_PHASE}/${MAX_PER_PHASE})` : n ? `${n} taget` : "Intet endnu"}</span>
                </button>
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
  const { data: photos = [], isLoading, isError, refetch } = useStopPhotos({ orderId });
  const [open, setOpen] = useState<StopPhoto | null>(null);
  if (isLoading || (photos.length === 0 && !isError)) return null;
  const runs = new Map<string, StopPhoto[]>();
  photos.forEach((p) => runs.set(p.stop_id, [...(runs.get(p.stop_id) || []), p]));
  const groups = [...runs.values()].sort((a, b) => b[0].created_at.localeCompare(a[0].created_at));

  return (
    <Section icon={<Camera className="h-3.5 w-3.5" />} title="Billedbevis" hint={`${photos.length} ${photos.length === 1 ? "billede" : "billeder"}`}>
      {isError ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary p-3 text-sm text-muted-foreground">
          Billederne kunne ikke hentes.
          <Button variant="outline" size="sm" className="h-11" onClick={() => void refetch()}>Prøv igen</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g[0].stop_id}>
              {groups.length > 1 && <p className="mb-2 text-sm font-medium text-foreground">Kørsel {format(new Date(g[0].created_at), "d. MMM yyyy", { locale: da })}</p>}
              <PhaseColumns photos={g} editable={false} busy={null} onOpen={setOpen} />
            </div>
          ))}
        </div>
      )}
      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </Section>
  );
}
