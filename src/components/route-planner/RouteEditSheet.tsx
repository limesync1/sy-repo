// RouteEditSheet — rediger en rute: navn, farve, dato, medarbejdere.
// Bruges fra den nye måned/uge kalender.

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, Trash2, UserPlus, X, Save, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUpdateRoute, useDeleteRoute, useOptimizeRoute, useAddRouteEmployee, useRemoveRouteEmployee, type Route } from "@/hooks/useRoutes";
import { DatePickerField } from "./DatePickerField";

export type RouteEmployeeOption = { id: string; name: string };

type Props = {
  route: Route | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachedEmployees: RouteEmployeeOption[];
  availableEmployees: RouteEmployeeOption[];
  stopCount: number;
};

/** Navngivne farver — bruges i picker, til tooltips og demo-data. */
export const ROUTE_COLORS = [
  { name: "Teal",     value: "#14b8a6" },
  { name: "Blå",      value: "#3b82f6" },
  { name: "Indigo",   value: "#6366f1" },
  { name: "Violet",   value: "#8b5cf6" },
  { name: "Pink",     value: "#ec4899" },
  { name: "Rød",      value: "#ef4444" },
  { name: "Orange",   value: "#f97316" },
  { name: "Amber",    value: "#f59e0b" },
  { name: "Emerald",  value: "#10b981" },
  { name: "Cyan",     value: "#06b6d4" },
  { name: "Slate",    value: "#64748b" },
  { name: "Fuchsia",  value: "#d946ef" },
] as const;

/** Bagudkompatibel farve-array (kun hex-værdier). */
export const ROUTE_COLOR_PALETTE = ROUTE_COLORS.map((c) => c.value);

/** Find første farve der ikke er i `usedColors` — eller en tilfældig hvis alle er brugt. */
export const pickAvailableColor = (usedColors: string[]): string => {
  const used = new Set(usedColors);
  const free = ROUTE_COLORS.find((c) => !used.has(c.value));
  if (free) return free.value;
  return ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)].value;
};

export const RouteEditSheet = ({
  route, open, onOpenChange, attachedEmployees, availableEmployees, stopCount,
}: Props) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(ROUTE_COLOR_PALETTE[0]);
  const [date, setDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();
  const optimize = useOptimizeRoute();
  const attach = useAddRouteEmployee();
  const detach = useRemoveRouteEmployee();

  useEffect(() => {
    if (!route) return;
    setName(route.name || "");
    setColor(route.color || ROUTE_COLOR_PALETTE[0]);
    setDate(route.route_date);
  }, [route?.id]);

  if (!route) return null;

  const dirty =
    (route.name || "") !== name ||
    route.color !== color ||
    route.route_date !== date;

  const handleSave = async () => {
    try {
      await updateRoute.mutateAsync({
        id: route.id,
        name: name.trim() || null,
        color,
        route_date: date,
      });
      toast.success("Rute opdateret");
    } catch { /* hook viser toast */ }
  };

  const handleDelete = async () => {
    try {
      await deleteRoute.mutateAsync(route.id);
      toast.success("Rute slettet");
      onOpenChange(false);
    } catch { /* */ }
    setConfirmDelete(false);
  };

  const handleOptimize = async () => {
    try {
      const result = await optimize.mutateAsync(route.id);
      toast.success(
        `${result.total_km.toFixed(1)} km · ${Math.floor(result.total_minutes / 60)}t ${result.total_minutes % 60}m`,
        { description: result.summary || result.reasoning },
      );
    } catch { /* */ }
  };

  const unattached = availableEmployees.filter((e) => !attachedEmployees.find((a) => a.id === e.id));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent
          className="w-full sm:max-w-md flex flex-col p-0 shadow-xl"
          hideOverlay
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full ring-2 ring-background"
                style={{ background: color }}
              />
              Rediger rute
            </SheetTitle>
            <SheetDescription>
              {date ? format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da }) : ""}
              {stopCount > 0 && <> · {stopCount} stop</>}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Navn */}
            <div className="space-y-2">
              <Label htmlFor="route-edit-name">Navn</Label>
              <Input
                id="route-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="fx Nord, Aarhus C, Mandag-team..."
              />
            </div>

            {/* Farve */}
            <div className="space-y-2">
              <Label>Farve</Label>
              <div className="grid grid-cols-6 gap-2">
                {ROUTE_COLORS.map((c) => {
                  const selected = color === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.name}
                      className={cn(
                        "relative aspect-square rounded-lg transition-all hover:scale-105 ring-offset-2 ring-offset-background flex items-center justify-center",
                        selected ? "ring-2 ring-foreground shadow-md" : "hover:ring-1 hover:ring-foreground/30",
                      )}
                      style={{ background: c.value }}
                      aria-label={`Vælg farve ${c.name}`}
                    >
                      {selected && <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Valgt: <span className="font-medium text-foreground">{ROUTE_COLORS.find((c) => c.value === color)?.name || "Brugerdefineret"}</span>
              </p>
            </div>

            {/* Dato */}
            <div className="space-y-2">
              <Label>Dato</Label>
              <DatePickerField value={date} onChange={setDate} />
              <p className="text-[11px] text-muted-foreground">
                Du kan også trække ruten direkte til en ny dag i kalenderen.
              </p>
            </div>

            <Separator />

            {/* Medarbejdere */}
            <div className="space-y-2">
              <Label>Medarbejdere på ruten</Label>
              {attachedEmployees.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Ingen medarbejdere tilkoblet endnu.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {attachedEmployees.map((e) => (
                    <Badge key={e.id} variant="secondary" className="gap-1.5 pr-1 py-1">
                      {e.name}
                      <button
                        type="button"
                        onClick={() => detach.mutate({ route_id: route.id, employee_id: e.id })}
                        className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive"
                        aria-label={`Fjern ${e.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {unattached.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />Tilkobl medarbejder
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {unattached.map((e) => (
                      <Button
                        key={e.id}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => attach.mutate({ route_id: route.id, employee_id: e.id })}
                      >
                        + {e.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t p-4 space-y-2 shrink-0 bg-card">
            {stopCount >= 2 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleOptimize}
                disabled={optimize.isPending}
              >
                {optimize.isPending
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Sparkles className="h-4 w-4 mr-2" />}
                Optimér rute (AI + Mapbox)
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />Slet
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={!dirty || updateRoute.isPending}
              >
                {updateRoute.isPending
                  ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  : <Save className="h-4 w-4 mr-1.5" />}
                Gem
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet rute?</AlertDialogTitle>
            <AlertDialogDescription>
              Ruten og dens {stopCount} stop slettes. Opgaverne vender tilbage til opgavepoolen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slet rute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};