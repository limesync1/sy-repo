// MoveStopsDialog — flyt udvalgte stops fra én rute til en anden dato.
//
// Brug: Klik "Flyt aftaler" i RouteEditSheet → vælg stops (checkboxes) → vælg
// måldato → tryk Flyt. Stoppene flyttes til en (eksisterende eller ny) rute
// for samme medarbejder på måldatoen via SQL-funktionen
// `find_or_create_route_for_employee`.
//
// Bemærk: Denne dialog flytter kun de konkrete stop-instanser ("kun denne
// gang"). For at flytte hele den faste serie til en anden ugedag skal man
// bruge dato-vælgeren i RouteEditSheet, der bruger MoveRouteDateDialog.

import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import { DatePickerField } from "./DatePickerField";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Route, RouteStop } from "@/hooks/useRoutes";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route | null;
  stops: RouteStop[];
};

export const MoveStopsDialog = ({ open, onOpenChange, route, stops }: Props) => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetDate, setTargetDate] = useState<string>("");
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setTargetDate(route?.route_date || "");
    }
  }, [open, route?.route_date]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = stops.length > 0 && stops.every((s) => selected.has(s.id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(stops.map((s) => s.id)));
  };

  const canConfirm = useMemo(() => {
    if (!route || !targetDate) return false;
    if (selected.size === 0) return false;
    if (targetDate === route.route_date) return false;
    return true;
  }, [route, targetDate, selected]);

  const handleConfirm = async () => {
    if (!route || !canConfirm) return;
    setMoving(true);
    try {
      // Én RPC i én transaktion — server-siden finder/opretter målrute pr.
      // medarbejder, sætter sequence korrekt og flytter alle valgte stops.
      const { data, error } = await supabase.rpc("move_stops_to_date", {
        _stop_ids: Array.from(selected),
        _target_date: targetDate,
      });
      if (error) {
        console.error("[MoveStops] move_stops_to_date fejlede", error);
        toast.error("Aftaler kunne ikke flyttes", {
          description: error.message || "Prøv igen om lidt.",
        });
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      const movedCount = Number(row?.moved_count ?? 0);
      const missingEmployee = Number(row?.missing_employee_count ?? 0);
      if (movedCount > 0) {
        toast.success(
          `${movedCount} aftale${movedCount === 1 ? "" : "r"} flyttet til ${format(parseISO(targetDate), "EEEE d. MMM", { locale: da })}`,
        );
      }
      if (missingEmployee > 0) {
        toast.error(
          `${missingEmployee} aftale${missingEmployee === 1 ? "" : "r"} mangler en medarbejder`,
          { description: "Tilknyt en medarbejder til ruten eller aftalen, og prøv igen." },
        );
      }
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["routes-range"] });
      qc.invalidateQueries({ queryKey: ["routes"] });
      if (movedCount > 0) onOpenChange(false);
    } finally {
      setMoving(false);
    }
  };

  if (!route) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" />
            Flyt aftaler til ny dato
          </DialogTitle>
          <DialogDescription>
            Vælg hvilke aftaler der skal flyttes — kun de markerede flyttes.
            Resten bliver liggende på den nuværende rute.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={toggleAll}
              className="text-accent hover:underline font-medium"
            >
              {allSelected ? "Fravælg alle" : "Vælg alle"}
            </button>
            <span className="text-muted-foreground">
              {selected.size} af {stops.length} valgt
            </span>
          </div>

          <div className="max-h-[260px] overflow-y-auto rounded-md border divide-y">
            {stops.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Ingen aftaler på ruten.
              </div>
            )}
            {stops.map((s) => {
              const isSelected = selected.has(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 cursor-pointer hover:bg-secondary/50 transition-colors",
                    isSelected && "bg-accent/5",
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(s.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.service_summary || "Aftale"}
                    </p>
                    {s.address && (
                      <p className="text-[11px] text-muted-foreground truncate">{s.address}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Flyt til dato
            </p>
            <DatePickerField value={targetDate} onChange={setTargetDate} />
            {targetDate && route.route_date && targetDate !== route.route_date && (
              <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="capitalize">
                  {format(parseISO(route.route_date), "EEEE d. MMM", { locale: da })}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="capitalize text-foreground font-medium">
                  {format(parseISO(targetDate), "EEEE d. MMM", { locale: da })}
                </span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={moving}>
            Annullér
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || moving}>
            {moving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Flyt {selected.size > 0 ? `${selected.size} ` : ""}aftale{selected.size === 1 ? "" : "r"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};