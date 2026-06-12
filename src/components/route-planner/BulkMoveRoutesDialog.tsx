import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowRight, CalendarDays, Loader2, MapPin, Minus, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bulk-flyt N ruter med ét tryk.
 *
 * - Brugeren vælger hvor mange dage ruterne skal forskydes (kan være negativt
 *   for at flytte tilbage).
 * - Pr. rute beregner vi den nye dato lokalt og viser en advarsel hvis:
 *     * den nye dato ligger i fortiden,
 *     * der allerede ligger en (anden) rute på den dato (kollision).
 * - Ruter med fejl bliver vist tydeligt og kan ikke flyttes — brugeren kan
 *   tage dem ud af valget før bekræftelse.
 */

export type BulkMoveRouteItem = {
  id: string;
  name: string;
  currentDate: string; // yyyy-MM-dd
  color?: string | null;
  /** Antal stop på ruten — vises som lille badge i previewet. */
  stopCount?: number | null;
  /** Navn på primær medarbejder — vises som lille badge. */
  employeeName?: string | null;
};

export type BulkMoveConflictCheck = (newDateByRoute: Map<string, string>) =>
  Map<string, { kind: "collision" | "past"; message: string } | null>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routes: BulkMoveRouteItem[];
  /** Synkron funktion: tager map fra route-id → ny dato, returnerer map med
   *  evt. konflikter pr. rute. Køres live mens brugeren ændrer offset. */
  detectConflicts: BulkMoveConflictCheck;
  /** Trækker en rute ud af valget — vises som "fjern"-knap pr. række. */
  onRemoveRoute: (id: string) => void;
  loading: boolean;
  /** Antal færdige ruter i nuværende mutation — bruges til progress-tekst. */
  progress?: { done: number; total: number } | null;
  onConfirm: (offsetDays: number) => void;
};

const todayIso = () => format(new Date(), "yyyy-MM-dd");

export const BulkMoveRoutesDialog = ({
  open, onOpenChange, routes, detectConflicts, onRemoveRoute, loading, progress, onConfirm,
}: Props) => {
  const [offset, setOffset] = useState(1);

  // Nulstil offset når dialogen åbnes — undgår at en gammel værdi fra forrige
  // bulk-flyt sniger sig ind og overrasker brugeren.
  useEffect(() => {
    if (open) setOffset(1);
  }, [open]);

  const newDates = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routes) {
      const d = addDays(parseISO(r.currentDate), offset);
      m.set(r.id, format(d, "yyyy-MM-dd"));
    }
    return m;
  }, [routes, offset]);

  const conflicts = useMemo(() => detectConflicts(newDates), [newDates, detectConflicts]);

  const today = todayIso();
  const blockedCount = routes.filter((r) => {
    const nd = newDates.get(r.id);
    if (!nd) return true;
    if (nd < today) return true;
    return !!conflicts.get(r.id);
  }).length;

  const okCount = routes.length - blockedCount;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" />
            Flyt {routes.length} {routes.length === 1 ? "rute" : "ruter"}
          </DialogTitle>
          <DialogDescription>
            Forskyd alle valgte ruter med samme antal dage. Konflikter
            (kollisioner eller fortid) blokerer kun de berørte ruter — resten
            flyttes som forventet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Offset-vælger */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="bulk-offset">Forskyd med (dage)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setOffset((v) => v - 1)}
                  disabled={loading}
                  aria-label="En dag tilbage"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="bulk-offset"
                  type="number"
                  value={offset}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setOffset(Number.isFinite(n) ? n : 0);
                  }}
                  className="w-24 text-center font-semibold tabular-nums"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setOffset((v) => v + 1)}
                  disabled={loading}
                  aria-label="En dag frem"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {[-7, -1, 1, 7].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  disabled={loading}
                  onClick={() => setOffset(n)}
                >
                  {n > 0 ? `+${n}` : n} {Math.abs(n) === 7 ? "uge" : "dag"}
                </Button>
              ))}
            </div>
          </div>

          {/* Preview-liste */}
          <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/20 p-2">
            {routes.map((r) => {
              const nd = newDates.get(r.id);
              const isPast = !!nd && nd < today;
              const conflict = conflicts.get(r.id);
              const blocked = isPast || !!conflict;
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm",
                    blocked && "border-destructive/30 bg-destructive/5",
                  )}
                >
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ background: r.color || "var(--muted-foreground)" }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-foreground">{r.name}</span>
                      {typeof r.stopCount === "number" && r.stopCount > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0 text-[10px] font-medium text-foreground/80 tabular-nums">
                          <MapPin className="h-2.5 w-2.5" />
                          {r.stopCount}
                        </span>
                      )}
                      {r.employeeName && (
                        <span className="inline-flex min-w-0 shrink items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0 text-[10px] font-medium text-foreground/80">
                          <User className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate max-w-[7rem]">{r.employeeName}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
                      <span>{format(parseISO(r.currentDate), "EEE d. MMM", { locale: da })}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className={cn(blocked && "text-destructive font-semibold")}>
                        {nd ? format(parseISO(nd), "EEE d. MMM", { locale: da }) : "—"}
                      </span>
                    </div>
                    {blocked && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-destructive">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {isPast
                            ? "Datoen ligger i fortiden"
                            : conflict?.message ?? "Konflikt på måldatoen"}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    disabled={loading}
                    onClick={() => onRemoveRoute(r.id)}
                  >
                    Fjern
                  </Button>
                </div>
              );
            })}
            {routes.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                Ingen ruter valgt.
              </div>
            )}
          </div>

          {/* Sammenfatning */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{okCount}</span> klar til at flytte
              {blockedCount > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-destructive">{blockedCount}</span> blokeret
                </>
              )}
            </span>
            {progress && (
              <span className="tabular-nums">
                Behandler {progress.done}/{progress.total}…
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annullér
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(offset)}
            disabled={loading || okCount === 0 || offset === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Flytter…
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Flyt {okCount} {okCount === 1 ? "rute" : "ruter"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};