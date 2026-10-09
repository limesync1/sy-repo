import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, CalendarPlus, Loader2, Search, X } from "lucide-react";
import { SheetHeaderBlock } from "./SheetSection";
import { UiArtwork } from "@/components/shared/UiArtwork";

/**
 * Bulk-tilføj valgte aftaler til en eksisterende rute med ét tryk.
 *
 * Brugeren ser:
 *   - Listen af valgte aftaler med adresse.
 *   - En søgbar liste af mulige mål-ruter (dato + navn + medarbejder).
 *
 * Selve mutationen sker udenfor — vi kalder bare `onConfirm(routeId)` så
 * RoutePlanner kan køre serielle `addStop`-mutationer gennem mutation-queue'en
 * og vise progress (samme mønster som bulk-flyt-ruter).
 */

export type BulkAddJobItem = {
  id: string;
  customer_name: string | null;
  address: string | null;
};

export type BulkAddRouteOption = {
  id: string;
  name: string | null;
  route_date: string;
  color?: string | null;
  employeeName?: string | null;
  /** Antal eksisterende stop — bruges til at vise rutens belastning. */
  stopCount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: BulkAddJobItem[];
  routes: BulkAddRouteOption[];
  loading: boolean;
  initialRouteId?: string | null;
  progress?: { done: number; total: number } | null;
  onRemoveJob: (id: string) => void;
  onConfirm: (routeId: string) => void;
};

export const BulkAddToRouteDialog = ({
  open, onOpenChange, jobs, routes, loading, progress, onRemoveJob, onConfirm, initialRouteId,
}: Props) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Nulstil valg når dialogen åbnes/lukkes — undgår at gammelt valg fra
  // forrige session lander på en rute der ikke længere er synlig.
  useEffect(() => {
    if (open) {
      setSelectedRouteId(initialRouteId ?? null);
      setSearch("");
    }
  }, [open, initialRouteId]);

  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = routes.slice().sort((a, b) => a.route_date.localeCompare(b.route_date));
    if (!q) return list;
    return list.filter((r) => {
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.employeeName || "").toLowerCase().includes(q) ||
        r.route_date.includes(q)
      );
    });
  }, [routes, search]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="planner-overlay w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] flex flex-col rounded-md p-0 overflow-hidden gap-0">
        <DialogHeader className="planner-overlay-header px-4 sm:px-5 py-3 pr-12 border-b shrink-0 space-y-0 text-left">
          <SheetHeaderBlock
            icon={<UiArtwork name="addAppointmentToRoute" className="h-6 w-6" />}
            title={<DialogTitle className="text-base">Tilføj {jobs.length} {jobs.length === 1 ? "aftale" : "aftaler"} til rute</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vælg en eksisterende rute. Aftalerne lægges som nye stop i slutningen af rutens rækkefølge.
              </DialogDescription>
            }
          />
        </DialogHeader>

        <div className="planner-overlay-body min-h-0 flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-0 bg-secondary/20">
          {/* Venstre: valgte aftaler */}
          <div className="border-b sm:border-b-0 sm:border-r p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Valgte aftaler</span><span className="tabular-nums normal-case font-medium">{jobs.length}</span>
            </div>
            <div className="max-h-[min(22dvh,10rem)] overflow-y-auto overscroll-contain sm:max-h-56">
              <div className="space-y-1.5 pr-2">
                {jobs.map((j, idx) => (
                  <div key={j.id} className="flex items-center gap-2.5 rounded-md border bg-card py-1.5 pl-2.5 pr-1 text-xs">
                    <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold tabular-nums text-foreground">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight truncate">{j.customer_name || "Uden navn"}</p>
                      {j.address && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{j.address}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Fjern ${j.customer_name || "aftale"}`}
                      className="h-11 w-11 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                      disabled={loading}
                      onClick={() => onRemoveJob(j.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Ingen aftaler valgt.</p>
                )}
              </div>
            </div>
          </div>

          {/* Højre: rute-vælger */}
          <div className="p-3 sm:p-4 space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-route-search" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Vælg rute
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="bulk-route-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søg dato, navn eller medarbejder…"
                  className="h-11 pl-9 text-base sm:h-9 sm:text-sm"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="max-h-[min(45dvh,22rem)] overflow-y-auto overscroll-contain sm:max-h-56">
              <div className="space-y-1.5 pr-2">
                {filteredRoutes.map((r) => {
                  const selected = selectedRouteId === r.id;
                  return (
                    <Button
                      variant="ghost"
                      type="button"
                      key={r.id}
                      onClick={() => setSelectedRouteId(r.id)}
                      aria-pressed={selected}
                      disabled={loading}
                      className={cn(
                        "block h-auto w-full min-w-0 min-h-16 whitespace-normal text-left rounded-md border bg-card px-3 py-2.5 transition-[background-color,border-color,box-shadow,transform] duration-150",
                        "hover:border-accent/40 hover:bg-secondary/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45",
                        selected && "border-foreground bg-secondary/50 ring-1 ring-foreground/20",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span aria-hidden className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md border text-foreground" style={{ borderColor: r.color || undefined, boxShadow: r.color ? `inset 0 3px 0 ${r.color}` : undefined }}>
                          <span className="text-[9px] font-semibold uppercase leading-none text-muted-foreground">{format(parseISO(r.route_date), "EEE", { locale: da })}</span>
                          <span className="text-base font-bold leading-tight tabular-nums">{format(parseISO(r.route_date), "d")}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight text-foreground">{r.name || "Uden navn"}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {format(parseISO(r.route_date), "d. MMMM", { locale: da })} · {r.employeeName || "Ingen medarbejder"}
                          </p>
                          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                            {r.stopCount} stop <span aria-hidden>→</span> <span className="font-semibold text-foreground">{r.stopCount + jobs.length} stop</span>
                          </p>
                        </div>
                        <span aria-hidden className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", selected ? "border-foreground bg-foreground text-background" : "border-border")}>
                          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                      </div>
                    </Button>
                  );
                })}
                {filteredRoutes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {routes.length === 0 ? "Ingen ruter i visningen." : "Ingen ruter matcher søgningen."}
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

        <DialogFooter className="planner-overlay-footer shrink-0 border-t bg-card p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="text-[11px] text-muted-foreground">
            {progress
              ? <span className="tabular-nums">Behandler {progress.done}/{progress.total}…</span>
              : selectedRouteId
                ? "Aftalerne lægges i bunden af rutens rækkefølge."
                : "Vælg en rute for at fortsætte."}
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2 sm:flex">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={loading}>
              Annullér
            </Button>
            <Button
              type="button"
              className="h-11"
               onClick={() => selectedRouteId && onConfirm(selectedRouteId)}
              disabled={loading || !selectedRouteId || jobs.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Tilføjer…
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4" />
                  Tilføj {jobs.length} {jobs.length === 1 ? "aftale" : "aftaler"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};