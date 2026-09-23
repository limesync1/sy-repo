import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowRight, CalendarDays, Loader2, MapPin, Route as RouteIcon, Search, User } from "lucide-react";
import { SheetHeaderBlock } from "./SheetSection";

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
  progress?: { done: number; total: number } | null;
  onRemoveJob: (id: string) => void;
  onConfirm: (routeId: string) => void;
};

export const BulkAddToRouteDialog = ({
  open, onOpenChange, jobs, routes, loading, progress, onRemoveJob, onConfirm,
}: Props) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Nulstil valg når dialogen åbnes/lukkes — undgår at gammelt valg fra
  // forrige session lander på en rute der ikke længere er synlig.
  useEffect(() => {
    if (open) {
      setSelectedRouteId(null);
      setSearch("");
    }
  }, [open]);

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
      <DialogContent className="planner-overlay w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-md p-0 overflow-hidden gap-0">
        <DialogHeader className="planner-overlay-header px-4 sm:px-5 py-3 pr-12 border-b shrink-0 space-y-0 text-left">
          <SheetHeaderBlock
            icon={<RouteIcon className="h-4 w-4" />}
            title={<DialogTitle className="text-base">Tilføj {jobs.length} {jobs.length === 1 ? "aftale" : "aftaler"} til rute</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vælg en eksisterende rute. Aftalerne lægges som nye stop i slutningen af rutens rækkefølge.
              </DialogDescription>
            }
          />
        </DialogHeader>

        <div className="planner-overlay-body grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-0 bg-secondary/20">
          {/* Venstre: valgte aftaler */}
          <div className="border-b sm:border-b-0 sm:border-r p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Valgte aftaler</span>
            </div>
            <ScrollArea className="h-56">
              <div className="space-y-1.5 pr-2">
                {jobs.map((j) => (
                  <div key={j.id} className="flex items-start gap-2 rounded-md border bg-card px-2 py-1.5 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{j.customer_name || "Uden navn"}</p>
                      {j.address && (
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-0.5 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" />{j.address}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5 text-[11px] text-muted-foreground"
                      disabled={loading}
                      onClick={() => onRemoveJob(j.id)}
                    >
                      Fjern
                    </Button>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Ingen aftaler valgt.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Højre: rute-vælger */}
          <div className="p-3 sm:p-4 space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-route-search" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Vælg rute
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="bulk-route-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søg dato, navn eller medarbejder…"
                  className="h-8 pl-7 text-xs"
                  disabled={loading}
                />
              </div>
            </div>
            <ScrollArea className="h-56">
              <div className="space-y-1 pr-2">
                {filteredRoutes.map((r) => {
                  const selected = selectedRouteId === r.id;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setSelectedRouteId(r.id)}
                      disabled={loading}
                      className={cn(
                        "w-full min-h-12 text-left rounded-md border bg-card px-2.5 py-2 transition-[background-color,border-color,box-shadow,transform] duration-150",
                        "hover:border-accent/40 hover:bg-secondary/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45",
                        selected && "border-accent ring-2 ring-accent/25 bg-accent/[0.04]",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-7 w-1 shrink-0 rounded-full"
                          style={{ background: r.color || "var(--muted-foreground)" }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
                            <p className="text-xs font-semibold truncate">
                              {format(parseISO(r.route_date), "EEE d. MMM", { locale: da })}
                            </p>
                            <span className="text-[11px] text-muted-foreground truncate">
                              · {r.name || "Uden navn"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />{r.stopCount} stop
                            </span>
                            {r.employeeName && (
                              <span className="inline-flex items-center gap-0.5 truncate">
                                <User className="h-2.5 w-2.5" />{r.employeeName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredRoutes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {routes.length === 0 ? "Ingen ruter i visningen." : "Ingen ruter matcher søgningen."}
                  </p>
                )}
              </div>
            </ScrollArea>

          </div>
        </div>

        <DialogFooter className="planner-overlay-footer border-t bg-card p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="text-[11px] text-muted-foreground">
            {progress
              ? <span className="tabular-nums">Behandler {progress.done}/{progress.total}…</span>
              : selectedRouteId
                ? "Aftalerne lægges i bunden af rutens rækkefølge."
                : "Vælg en rute for at fortsætte."}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annullér
            </Button>
            <Button
              type="button"
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
                  <ArrowRight className="h-4 w-4" />
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