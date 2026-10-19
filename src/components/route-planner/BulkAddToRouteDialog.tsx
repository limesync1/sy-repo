import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, CalendarPlus, Loader2, Search, X } from "lucide-react";
import { Section, SheetFooterBar } from "./SheetSection";
import { UiArtwork } from "@/components/shared/UiArtwork";
import PlannerDialogHeader from "./PlannerDialogHeader";
import { CARD_BASE, CARD_BORDER, CARD_SELECTED } from "./lib/card-styles";

/**
 * Bulk-tilføj valgte aftaler til en eksisterende rute med ét tryk.
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

  useEffect(() => {
    if (open) {
      setSelectedRouteId(initialRouteId ?? null);
      setSearch("");
    }
  }, [open, initialRouteId]);

  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = routes.slice().sort((a, b) => {
      if (a.id === initialRouteId) return -1;
      if (b.id === initialRouteId) return 1;
      return a.route_date.localeCompare(b.route_date);
    });
    if (!q) return list;
    return list.filter((r) => {
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.employeeName || "").toLowerCase().includes(q) ||
        r.route_date.includes(q)
      );
    });
  }, [routes, search, initialRouteId]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="planner-overlay flex max-h-[calc(100dvh-0.75rem)] min-w-0 flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:max-h-[calc(100dvh-2rem)] sm:p-0">
        <PlannerDialogHeader
          artwork={<UiArtwork name="addAppointmentToRoute" className="h-14 w-14" />}
          title={`Tilføj ${jobs.length} ${jobs.length === 1 ? "aftale" : "aftaler"} til rute`}
          description="Vælg ruten, som aftalerne skal tilføjes til."
        />

        <div className="planner-overlay-body grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 overflow-y-auto overflow-x-hidden bg-secondary/20 p-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] sm:p-4">
          {/* Venstre: valgte aftaler */}
          <Section 
            icon={<Check className="h-4 w-4" />} 
            title="Valgte aftaler" 
            hint={`${jobs.length} ${jobs.length === 1 ? "valgt" : "valgte"}`}
            tone="accent"
            className="min-w-0 self-start"
          >
            <div className="min-w-0">
              <div className="space-y-1.5">
                {jobs.map((j, idx) => (
                  <div key={j.id} className={cn(CARD_BASE, CARD_BORDER, "flex min-w-0 items-center gap-2 py-1.5 pl-2.5 pr-1 text-xs")}>
                    <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold tabular-nums text-foreground">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-snug">{j.customer_name || "Uden navn"}</p>
                      {j.address && (
                        <p className="mt-0.5 break-words text-xs text-muted-foreground">{j.address}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Fjern ${j.customer_name || "aftale"}`}
                      className="h-11 w-11 shrink-0 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
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
          </Section>

          {/* Højre: rute-vælger */}
          <Section 
            icon={<CalendarPlus className="h-4 w-4" />} 
            title="Vælg rute" 
            tone="sky"
            className="min-w-0 self-start"
          >
            <div className="space-y-1.5">
              <label htmlFor="bulk-route-search" className="text-[13px] font-medium text-foreground">Søg efter rute</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="bulk-route-search"
                  name="route-filter"
                  autoComplete="off"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søg dato, navn eller medarbejder…"
                  className="h-11 min-w-0 pl-9 text-base sm:text-sm"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="min-w-0">
              <div className="space-y-1.5">
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
                        CARD_BASE, CARD_BORDER,
                        "block h-auto w-full min-w-0 min-h-16 whitespace-normal px-2.5 py-2 text-left hover:border-accent/40 hover:bg-secondary/40 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-45",
                        selected && CARD_SELECTED,
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span aria-hidden className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md border bg-background text-foreground shadow-sm" style={{ borderColor: r.color || undefined, boxShadow: r.color ? `inset 0 3px 0 ${r.color}` : undefined }}>
                          <span className="text-[9px] font-bold uppercase leading-none text-muted-foreground">{format(parseISO(r.route_date), "EEE", { locale: da })}</span>
                          <span className="text-base font-bold leading-tight tabular-nums">{format(parseISO(r.route_date), "d")}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold leading-snug text-foreground">{r.name || "Uden navn"}</p>
                          <p className="mt-0.5 break-words text-xs text-muted-foreground">
                            {format(parseISO(r.route_date), "d. MMMM", { locale: da })} · {r.employeeName || "Ingen medarbejder"}
                          </p>
                          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                            {r.stopCount} stop <span aria-hidden>→</span> <span className="font-semibold text-foreground">{r.stopCount + jobs.length} stop</span>
                          </p>
                        </div>
                        <span aria-hidden className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors", selected ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background")}>
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
          </Section>
        </div>

        <SheetFooterBar className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-card">
          <div className="text-[11px] text-muted-foreground px-1">
            {progress
              ? <span className="tabular-nums font-medium text-foreground">Behandler {progress.done}/{progress.total}…</span>
              : selectedRouteId
                ? "Aftalerne lægges i bunden af rutens rækkefølge."
                : "Vælg en rute for at fortsætte."}
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
            <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => onOpenChange(false)} disabled={loading}>
              Annullér
            </Button>
            <Button
              type="button"
              variant="default"
              className="h-11 flex-1 sm:flex-none"
              onClick={() => selectedRouteId && onConfirm(selectedRouteId)}
              disabled={loading || !selectedRouteId || jobs.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Tilføjer…
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Tilføj {jobs.length} {jobs.length === 1 ? "aftale" : "aftaler"}
                </>
              )}
            </Button>
          </div>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
};
