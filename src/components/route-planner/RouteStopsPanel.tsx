// RouteStopsPanel — slide-in panel der viser alle stops for den valgte rute.
// Brugeren kan: omrangere via drag, klikke for at åbne detail, fjerne stop fra ruten.
// Vises ved siden af RouteEditSheet.

import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin, Clock, Trash2, Inbox, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useReorderStops, useDeleteStop, type RouteStop, type Route,
} from "@/hooks/useRoutes";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  route: Route | null;
  stops: RouteStop[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStop: (stop: RouteStop) => void;
};

export const RouteStopsPanel = ({ route, stops, open, onOpenChange, onSelectStop }: Props) => {
  const reorder = useReorderStops();
  const deleteStop = useDeleteStop();
  const [confirmDelete, setConfirmDelete] = useState<RouteStop | null>(null);

  // Lokal sorteret liste — opdateres når DB-data ændrer sig
  const [items, setItems] = useState<RouteStop[]>([]);
  useEffect(() => {
    setItems([...stops].sort((a, b) => a.sequence - b.sequence));
  }, [stops]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((s) => s.id === active.id);
    const newIdx = items.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next); // optimistisk
    try {
      await reorder.mutateAsync(next.map((s, i) => ({ id: s.id, sequence: i })));
      toast.success("Rækkefølge opdateret");
    } catch {
      // Revert hvis fejl
      setItems([...stops].sort((a, b) => a.sequence - b.sequence));
    }
  };

  const handleDelete = async (stop: RouteStop) => {
    try {
      await deleteStop.mutateAsync(stop.id);
      toast.success("Stop fjernet — opgaven ryger tilbage i opgavepoolen");
    } catch (err: any) {
      toast.error(err.message || "Kunne ikke fjerne stop");
    }
    setConfirmDelete(null);
  };

  if (!route) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-sm flex flex-col p-0 sm:right-[28rem] shadow-xl"
          // Vis ved siden af RouteEditSheet (som er sm:max-w-md ≈ 28rem bred)
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: route.color }}
              />
              Stops på ruten
              <span className="ml-auto inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-semibold tabular-nums">
                {items.length}
              </span>
            </SheetTitle>
            <SheetDescription className="text-xs">
              Træk for at omrangere · Klik for detaljer
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 px-4">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <Inbox className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Ingen stops endnu. Træk opgaver fra opgavepoolen ind på ruten.
                </p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <ol className="space-y-1.5">
                    {items.map((stop, idx) => (
                      <SortableStopRow
                        key={stop.id}
                        stop={stop}
                        index={idx + 1}
                        color={route.color}
                        onSelect={() => onSelectStop(stop)}
                        onRemove={() => setConfirmDelete(stop)}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {reorder.isPending && (
            <div className="border-t px-4 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />Gemmer rækkefølge…
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern stop fra ruten?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.customer_name}</strong> fjernes fra ruten.
              Hvis stoppet kommer fra en ordre, ryger den tilbage i opgavepoolen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Fjern stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/* ─── Sortable row ─── */
type RowProps = {
  stop: RouteStop;
  index: number;
  color: string;
  onSelect: () => void;
  onRemove: () => void;
};

const SortableStopRow = ({ stop, index, color, onSelect, onRemove }: RowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-md border bg-card transition-shadow",
        isDragging ? "shadow-lg opacity-80 ring-2 ring-accent" : "hover:shadow-sm",
      )}
    >
      <div className="flex items-stretch">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex items-center justify-center px-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground rounded-l-md"
          aria-label="Træk for at omrangere"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Sequence indicator */}
        <div
          className="flex items-center justify-center w-7 text-[11px] font-bold text-white tabular-nums shrink-0"
          style={{ background: color }}
        >
          {index}
        </div>

        {/* Content — clickable */}
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 text-left px-2.5 py-2 min-w-0 hover:bg-accent/5"
        >
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold truncate flex-1">
              {stop.customer_name || "Ukendt kunde"}
            </p>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
          </div>
          {stop.address && (
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <MapPin className="h-2.5 w-2.5 shrink-0" />{stop.address}
            </p>
          )}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 tabular-nums">
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{stop.duration_minutes} min
            </span>
            {stop.time_window_start && (
              <Badge variant="outline" className="h-3.5 px-1 text-[9px]">
                {stop.time_window_start.slice(0, 5)}
                {stop.time_window_end ? `–${stop.time_window_end.slice(0, 5)}` : ""}
              </Badge>
            )}
            {stop.status === "completed" && (
              <span className="text-emerald-600">✓ Færdig</span>
            )}
          </div>
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-r-md opacity-0 group-hover:opacity-100"
          aria-label="Fjern stop"
          title="Fjern stop fra rute"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
};
