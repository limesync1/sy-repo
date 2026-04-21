// RouteStopsPanel — slide-in panel der viser alle stops for den valgte rute.
// Brugeren kan: omrangere via drag, klikke for at åbne detail, fjerne stop fra ruten.
// Vises ved siden af RouteEditSheet.

import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, MapPin, Clock, Trash2, Inbox, ExternalLink, Loader2,
  Crown, UserPlus, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useReorderStops, useDeleteStop, useSetStopAssignees,
  type RouteStop, type Route,
} from "@/hooks/useRoutes";
import { formatDurationMin } from "@/lib/duration-format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmployeeAvatars, type EmpAvatar } from "./EmployeeAvatars";

type Props = {
  route: Route | null;
  stops: RouteStop[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStop: (stop: RouteStop) => void;
  /** Aktive medarbejdere for virksomheden — bruges til inline assignee-picker. */
  employees: EmpAvatar[];
};

export const RouteStopsPanel = ({ route, stops, open, onOpenChange, onSelectStop, employees }: Props) => {
  const reorder = useReorderStops();
  const deleteStop = useDeleteStop();
  const setAssignees = useSetStopAssignees();
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
          hideOverlay
          hideCloseButton
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
                        employees={employees}
                        onSetAssignees={(ids, lead) =>
                          setAssignees.mutate({ stop_id: stop.id, employee_ids: ids, lead_id: lead })
                        }
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
  employees: EmpAvatar[];
  onSetAssignees: (ids: string[], lead: string | null) => void;
  onSelect: () => void;
  onRemove: () => void;
};

const SortableStopRow = ({ stop, index, color, employees, onSetAssignees, onSelect, onRemove }: RowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assigneeIds = stop.assignee_ids ?? (stop.assigned_employee_id ? [stop.assigned_employee_id] : []);
  const leadId = stop.lead_employee_id ?? stop.assigned_employee_id ?? null;
  const assigneeEmps = assigneeIds
    .map((id) => employees.find((e) => e.id === id))
    .filter(Boolean) as EmpAvatar[];

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
            {assigneeEmps.length > 0 && (
              <EmployeeAvatars employees={assigneeEmps} size={16} max={3} />
            )}
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
          </div>
          {stop.address && (
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <MapPin className="h-2.5 w-2.5 shrink-0" />{stop.address}
            </p>
          )}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 tabular-nums">
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{formatDurationMin(stop.duration_minutes, { short: true })}
            </span>
            {stop.time_window_start && (
              <Badge variant="outline" className="h-3.5 px-1 text-[9px]">
                {stop.time_window_start.slice(0, 5)}
                {stop.time_window_end ? `–${stop.time_window_end.slice(0, 5)}` : ""}
              </Badge>
            )}
            {stop.status === "completed" && (
              <span className="text-foreground/80">✓ Færdig</span>
            )}
          </div>
        </button>

        {/* Right-side actions: assignee toggle + remove */}
        <div className="flex items-stretch border-l border-border/50">
          <AssigneeToggle
            employees={employees}
            selectedIds={assigneeIds}
            leadId={leadId}
            onChange={onSetAssignees}
          />
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
      </div>
    </li>
  );
};

/* ─── Inline assignee picker — popover med checkbox-liste + lead-knap. ─── */
const AssigneeToggle = ({
  employees, selectedIds, leadId, onChange,
}: {
  employees: EmpAvatar[];
  selectedIds: string[];
  leadId: string | null;
  onChange: (ids: string[], lead: string | null) => void;
}) => {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((x) => x !== id);
      const nextLead = leadId === id ? next[0] ?? null : leadId;
      onChange(next, nextLead);
    } else {
      const next = [...selectedIds, id];
      const nextLead = leadId ?? next[0];
      onChange(next, nextLead);
    }
  };
  const setLead = (id: string) => {
    if (!selectedIds.includes(id)) onChange([...selectedIds, id], id);
    else onChange(selectedIds, id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center w-8 text-muted-foreground hover:text-foreground hover:bg-accent/10",
            selectedIds.length > 0 && "text-foreground",
          )}
          aria-label="Tildel medarbejdere"
          title="Tildel/fjern medarbejdere"
          onClick={(e) => e.stopPropagation()}
        >
          <UserPlus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1 font-semibold">
          Tildel medarbejdere
        </p>
        {employees.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2 py-3 text-center">
            Ingen aktive medarbejdere.
          </p>
        ) : (
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {employees.map((e) => {
              const selected = selectedIds.includes(e.id);
              const isLead = leadId === e.id;
              return (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    selected ? "bg-accent/10" : "hover:bg-accent/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        selected ? "border-foreground bg-foreground text-background" : "border-border",
                      )}
                    >
                      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {e.avatar_url ? (
                      <img src={e.avatar_url} alt={e.name} className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <span
                        className="h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: e.color || "hsl(220 13% 46%)" }}
                      >
                        {e.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-xs flex-1">{e.name}</span>
                  </button>
                  {selected && (
                    <button
                      type="button"
                      onClick={() => setLead(e.id)}
                      className={cn(
                        "shrink-0 h-6 w-6 inline-flex items-center justify-center rounded transition-colors",
                        isLead
                          ? "text-amber-600 bg-amber-50"
                          : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50",
                      )}
                      title={isLead ? "Lead-medarbejder" : "Sæt som lead"}
                      aria-label="Sæt som lead"
                    >
                      <Crown className="h-3.5 w-3.5" fill={isLead ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {selectedIds.length > 1 && (
          <p className="text-[10px] text-muted-foreground mt-2 px-1 italic">
            Provision deles ligeligt ({Math.round(100 / selectedIds.length)}% pr. medarbejder).
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};
